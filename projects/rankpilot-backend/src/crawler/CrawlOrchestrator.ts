import { getPrisma } from '../config/database.js';
import { createLogger } from '../config/logger.js';
import { toErrorMessage } from '../utils/errors.js';
import { CrawlerService } from './CrawlerService.js';
import { ScoringService } from '../analysis/ScoringService.js';
import { FixGeneratorService } from '../analysis/FixGeneratorService.js';
import type { PageScore } from '../analysis/types.js';

const logger = createLogger('crawl-orchestrator');

export class CrawlOrchestrator {
  private readonly crawler = new CrawlerService();
  private readonly scorer = new ScoringService();
  private readonly fixGenerator = new FixGeneratorService();

  async executeCrawl(crawlId: string, siteUrl: string, maxPages: number): Promise<void> {
    const prisma = getPrisma();

    // Mark crawl as running
    await prisma.crawl.update({
      where: { id: crawlId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    try {
      // Run the crawler
      const result = await this.crawler.crawl(siteUrl, { maxPages });

      // Score each page and generate fixes — update pageCount incrementally
      const pageScores: PageScore[] = [];
      let processedCount = 0;

      for (const pageData of result.pages) {
        const score = this.scorer.scorePage(pageData);
        pageScores.push(score);

        const fixes = await this.fixGenerator.generateFixes(pageData, score.issues);

        await prisma.crawlPage.create({
          data: {
            crawlId,
            url: pageData.url,
            httpStatus: pageData.httpStatus,
            title: pageData.title,
            metaDescription: pageData.metaDescription,
            h1: pageData.h1,
            h2s: pageData.h2s,
            wordCount: pageData.wordCount,
            imageCount: pageData.imageCount,
            imagesWithoutAlt: pageData.imagesWithoutAlt,
            internalLinks: pageData.internalLinks,
            externalLinks: pageData.externalLinks,
            canonicalUrl: pageData.canonicalUrl,
            ogTags: pageData.ogTags,
            structuredData: pageData.structuredData as object[],
            hasViewportMeta: pageData.hasViewportMeta,
            isIndexable: pageData.isIndexable,
            redirectChain: pageData.redirectChain,
            seoScore: score.overall,
            issues: score.issues as object[],
            fixes: fixes as object[],
          },
        });

        processedCount++;
        await prisma.crawl.update({
          where: { id: crawlId },
          data: { pageCount: processedCount },
        });
      }

      const overallScore = this.scorer.calculateSiteScore(pageScores);

      // Get the previous crawl's score for comparison
      const previousCrawl = await prisma.crawl.findFirst({
        where: {
          siteId: (await prisma.crawl.findUnique({ where: { id: crawlId } }))?.siteId,
          status: 'COMPLETE',
          id: { not: crawlId },
        },
        orderBy: { completedAt: 'desc' },
        select: { overallScore: true },
      });

      await prisma.crawl.update({
        where: { id: crawlId },
        data: {
          status: 'COMPLETE',
          completedAt: new Date(),
          pageCount: result.pages.length,
          overallScore,
          previousScore: previousCrawl?.overallScore,
        },
      });

      logger.info('Crawl orchestration complete', {
        crawlId,
        pages: result.pages.length,
        overallScore,
      });
    } catch (error: unknown) {
      logger.error('Crawl orchestration failed', {
        crawlId,
        error: toErrorMessage(error),
      });

      await prisma.crawl.update({
        where: { id: crawlId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: toErrorMessage(error),
        },
      });
    }
  }
}
