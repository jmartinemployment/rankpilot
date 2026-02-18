import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getPrisma } from '../config/database.js';
import { AnalyticsParsingService } from '../analysis/AnalyticsParsingService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { createLogger } from '../config/logger.js';
import { toErrorMessage } from '../utils/errors.js';
import type { AnalyticsRow } from '../analysis/AnalyticsParsingService.js';

const router = Router();
const logger = createLogger('analytics-routes');
const parsingService = new AnalyticsParsingService();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

const labelSchema = z.enum(['BEFORE', 'AFTER']);

// POST /api/sites/:siteId/analytics — Upload a GA4 CSV snapshot
router.post('/api/sites/:siteId/analytics', upload.single('file'), async (req, res) => {
  try {
    const prisma = getPrisma();
    const siteId = req.params.siteId as string;

    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      sendError(res, 'Site not found', 404);
      return;
    }

    if (!req.file) {
      sendError(res, 'CSV file is required', 400);
      return;
    }

    const labelParsed = labelSchema.safeParse(req.body.label);
    if (!labelParsed.success) {
      sendError(res, 'label must be "BEFORE" or "AFTER"', 400, 'VALIDATION_ERROR');
      return;
    }

    const crawlId: string | null = req.body.crawlId ?? null;
    if (crawlId) {
      const crawl = await prisma.crawl.findUnique({ where: { id: crawlId } });
      if (!crawl || crawl.siteId !== siteId) {
        sendError(res, 'Crawl not found for this site', 404);
        return;
      }
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const parsed = parsingService.parse(csvContent);

    // Delete any existing snapshot with the same label for this site
    await prisma.analyticsSnapshot.deleteMany({
      where: { siteId, label: labelParsed.data },
    });

    const snapshot = await prisma.analyticsSnapshot.create({
      data: {
        siteId,
        crawlId,
        label: labelParsed.data,
        dateRange: parsed.dateRange,
        rows: JSON.parse(JSON.stringify(parsed.rows)),
        rowCount: parsed.rowCount,
      },
    });

    logger.info('Analytics snapshot uploaded', {
      snapshotId: snapshot.id,
      siteId,
      label: labelParsed.data,
      rowCount: parsed.rowCount,
    });

    sendSuccess(res, {
      id: snapshot.id,
      label: snapshot.label,
      rowCount: snapshot.rowCount,
      dateRange: snapshot.dateRange,
      createdAt: snapshot.createdAt,
    }, 201);
  } catch (error: unknown) {
    logger.error('Failed to upload analytics', { error: toErrorMessage(error) });
    sendError(res, toErrorMessage(error), 400);
  }
});

// GET /api/sites/:siteId/analytics — List all snapshots for a site
router.get('/api/sites/:siteId/analytics', async (req, res) => {
  try {
    const prisma = getPrisma();
    const siteId = req.params.siteId as string;

    const snapshots = await prisma.analyticsSnapshot.findMany({
      where: { siteId },
      select: {
        id: true,
        siteId: true,
        crawlId: true,
        label: true,
        dateRange: true,
        rowCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, snapshots);
  } catch (error: unknown) {
    logger.error('Failed to list analytics', { error: toErrorMessage(error) });
    sendError(res, 'Failed to list analytics snapshots');
  }
});

// GET /api/sites/:siteId/analytics/comparison — Get before/after diff
router.get('/api/sites/:siteId/analytics/comparison', async (req, res) => {
  try {
    const prisma = getPrisma();
    const siteId = req.params.siteId as string;

    const beforeSnapshot = await prisma.analyticsSnapshot.findFirst({
      where: { siteId, label: 'BEFORE' },
      orderBy: { createdAt: 'desc' },
    });

    const afterSnapshot = await prisma.analyticsSnapshot.findFirst({
      where: { siteId, label: 'AFTER' },
      orderBy: { createdAt: 'desc' },
    });

    if (!beforeSnapshot || !afterSnapshot) {
      sendError(res, 'Both BEFORE and AFTER snapshots are required for comparison', 400, 'INCOMPLETE_DATA');
      return;
    }

    const beforeRows = beforeSnapshot.rows as unknown as AnalyticsRow[];
    const afterRows = afterSnapshot.rows as unknown as AnalyticsRow[];

    const beforeMap = new Map<string, AnalyticsRow>();
    for (const row of beforeRows) {
      beforeMap.set(row.path, row);
    }

    const afterMap = new Map<string, AnalyticsRow>();
    for (const row of afterRows) {
      afterMap.set(row.path, row);
    }

    // Collect all unique paths
    const allPaths = new Set([...beforeMap.keys(), ...afterMap.keys()]);

    const comparisonRows = [...allPaths].map(path => {
      const before = beforeMap.get(path);
      const after = afterMap.get(path);

      const beforeViews = before?.views ?? 0;
      const afterViews = after?.views ?? 0;
      const viewsChange = afterViews - beforeViews;
      const viewsChangePct = beforeViews > 0 ? (viewsChange / beforeViews) * 100 : (afterViews > 0 ? 100 : 0);

      const beforeUsers = before?.activeUsers ?? 0;
      const afterUsers = after?.activeUsers ?? 0;
      const usersChange = afterUsers - beforeUsers;

      const beforeEngagement = before?.avgEngagementTime ?? 0;
      const afterEngagement = after?.avgEngagementTime ?? 0;

      return {
        path,
        beforeViews,
        afterViews,
        viewsChange,
        viewsChangePct: Math.round(viewsChangePct * 10) / 10,
        beforeUsers,
        afterUsers,
        usersChange,
        beforeEngagement,
        afterEngagement,
      };
    });

    // Sort by absolute views change descending (biggest movers first)
    comparisonRows.sort((a, b) => Math.abs(b.viewsChange) - Math.abs(a.viewsChange));

    sendSuccess(res, {
      before: {
        id: beforeSnapshot.id,
        siteId: beforeSnapshot.siteId,
        crawlId: beforeSnapshot.crawlId,
        label: beforeSnapshot.label,
        dateRange: beforeSnapshot.dateRange,
        rowCount: beforeSnapshot.rowCount,
        createdAt: beforeSnapshot.createdAt,
      },
      after: {
        id: afterSnapshot.id,
        siteId: afterSnapshot.siteId,
        crawlId: afterSnapshot.crawlId,
        label: afterSnapshot.label,
        dateRange: afterSnapshot.dateRange,
        rowCount: afterSnapshot.rowCount,
        createdAt: afterSnapshot.createdAt,
      },
      rows: comparisonRows,
    });
  } catch (error: unknown) {
    logger.error('Failed to generate comparison', { error: toErrorMessage(error) });
    sendError(res, 'Failed to generate analytics comparison');
  }
});

// DELETE /api/sites/:siteId/analytics/:id — Delete a snapshot
router.delete('/api/sites/:siteId/analytics/:id', async (req, res) => {
  try {
    const prisma = getPrisma();
    const siteId = req.params.siteId as string;
    const id = req.params.id as string;

    const snapshot = await prisma.analyticsSnapshot.findUnique({ where: { id } });
    if (!snapshot || snapshot.siteId !== siteId) {
      sendError(res, 'Snapshot not found', 404);
      return;
    }

    await prisma.analyticsSnapshot.delete({ where: { id } });
    logger.info('Analytics snapshot deleted', { snapshotId: id, siteId });
    sendSuccess(res, { deleted: true });
  } catch (error: unknown) {
    logger.error('Failed to delete snapshot', { error: toErrorMessage(error) });
    sendError(res, 'Failed to delete snapshot');
  }
});

export default router;
