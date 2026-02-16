import { Router } from 'express';
import { z } from 'zod';
import { getPrisma } from '../config/database.js';
import { CrawlOrchestrator } from '../crawler/CrawlOrchestrator.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { createLogger } from '../config/logger.js';
import { toErrorMessage } from '../utils/errors.js';

const router = Router();
const logger = createLogger('sites-routes');

const createSiteSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1).max(255),
  crawlDepthLimit: z.number().int().min(1).max(5000).optional(),
});

// POST /api/sites — Register a new site
router.post('/api/sites', async (req, res) => {
  try {
    const parsed = createSiteSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.issues[0].message, 400, 'VALIDATION_ERROR');
      return;
    }

    const prisma = getPrisma();
    const site = await prisma.site.create({
      data: {
        url: parsed.data.url,
        name: parsed.data.name,
        crawlDepthLimit: parsed.data.crawlDepthLimit ?? 50,
      },
    });

    logger.info('Site created', { siteId: site.id, url: site.url });
    sendSuccess(res, site, 201);
  } catch (error: unknown) {
    logger.error('Failed to create site', { error: toErrorMessage(error) });
    sendError(res, 'Failed to create site');
  }
});

// GET /api/sites — List all sites
router.get('/api/sites', async (_req, res) => {
  try {
    const prisma = getPrisma();
    const sites = await prisma.site.findMany({
      include: {
        crawls: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            overallScore: true,
            previousScore: true,
            pageCount: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, sites);
  } catch (error: unknown) {
    logger.error('Failed to list sites', { error: toErrorMessage(error) });
    sendError(res, 'Failed to list sites');
  }
});

// GET /api/sites/:id — Get a single site
router.get('/api/sites/:id', async (req, res) => {
  try {
    const prisma = getPrisma();
    const site = await prisma.site.findUnique({
      where: { id: req.params.id },
      include: {
        crawls: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            overallScore: true,
            previousScore: true,
            pageCount: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!site) {
      sendError(res, 'Site not found', 404);
      return;
    }

    sendSuccess(res, site);
  } catch (error: unknown) {
    logger.error('Failed to get site', { error: toErrorMessage(error) });
    sendError(res, 'Failed to get site');
  }
});

// POST /api/sites/:id/crawl — Trigger a new crawl
router.post('/api/sites/:id/crawl', async (req, res) => {
  try {
    const prisma = getPrisma();
    const site = await prisma.site.findUnique({ where: { id: req.params.id } });

    if (!site) {
      sendError(res, 'Site not found', 404);
      return;
    }

    // Check for active crawl
    const activeCrawl = await prisma.crawl.findFirst({
      where: {
        siteId: site.id,
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    if (activeCrawl) {
      sendError(res, 'A crawl is already in progress for this site', 409, 'CRAWL_IN_PROGRESS');
      return;
    }

    const crawl = await prisma.crawl.create({
      data: { siteId: site.id },
    });

    logger.info('Crawl triggered', { crawlId: crawl.id, siteId: site.id });

    // Start crawl in background (don't await)
    const orchestrator = new CrawlOrchestrator();
    orchestrator.executeCrawl(crawl.id, site.url, site.crawlDepthLimit).catch((error: unknown) => {
      logger.error('Background crawl failed', { crawlId: crawl.id, error: toErrorMessage(error) });
    });

    sendSuccess(res, crawl, 202);
  } catch (error: unknown) {
    logger.error('Failed to trigger crawl', { error: toErrorMessage(error) });
    sendError(res, 'Failed to trigger crawl');
  }
});

export default router;
