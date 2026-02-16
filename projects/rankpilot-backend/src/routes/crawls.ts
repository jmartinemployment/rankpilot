import { Router } from 'express';
import { getPrisma } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { createLogger } from '../config/logger.js';
import { toErrorMessage } from '../utils/errors.js';

const router = Router();
const logger = createLogger('crawls-routes');

// GET /api/crawls/:id — Get crawl status and results
router.get('/api/crawls/:id', async (req, res) => {
  try {
    const prisma = getPrisma();
    const crawl = await prisma.crawl.findUnique({
      where: { id: req.params.id },
      include: {
        site: { select: { id: true, url: true, name: true } },
        _count: { select: { pages: true } },
      },
    });

    if (!crawl) {
      sendError(res, 'Crawl not found', 404);
      return;
    }

    sendSuccess(res, crawl);
  } catch (error: unknown) {
    logger.error('Failed to get crawl', { error: toErrorMessage(error) });
    sendError(res, 'Failed to get crawl');
  }
});

// GET /api/crawls/:id/pages — Get paginated page results
router.get('/api/crawls/:id/pages', async (req, res) => {
  try {
    const prisma = getPrisma();
    const page = Number.parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(Number.parseInt(req.query.limit as string, 10) || 20, 100);
    const sortBy = (req.query.sortBy as string) ?? 'seoScore';
    const sortOrder = (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';

    const crawl = await prisma.crawl.findUnique({ where: { id: req.params.id } });
    if (!crawl) {
      sendError(res, 'Crawl not found', 404);
      return;
    }

    const [pages, total] = await Promise.all([
      prisma.crawlPage.findMany({
        where: { crawlId: req.params.id },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          url: true,
          httpStatus: true,
          title: true,
          seoScore: true,
          wordCount: true,
          imageCount: true,
          imagesWithoutAlt: true,
          internalLinks: true,
          hasViewportMeta: true,
          issues: true,
        },
      }),
      prisma.crawlPage.count({ where: { crawlId: req.params.id } }),
    ]);

    sendSuccess(res, {
      pages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to get crawl pages', { error: toErrorMessage(error) });
    sendError(res, 'Failed to get crawl pages');
  }
});

// GET /api/crawls/:id/pages/:pageId — Get single page detail with fixes
router.get('/api/crawls/:id/pages/:pageId', async (req, res) => {
  try {
    const prisma = getPrisma();
    const crawlPage = await prisma.crawlPage.findUnique({
      where: { id: req.params.pageId },
    });

    if (!crawlPage || crawlPage.crawlId !== req.params.id) {
      sendError(res, 'Page not found', 404);
      return;
    }

    sendSuccess(res, crawlPage);
  } catch (error: unknown) {
    logger.error('Failed to get crawl page', { error: toErrorMessage(error) });
    sendError(res, 'Failed to get crawl page');
  }
});

export default router;
