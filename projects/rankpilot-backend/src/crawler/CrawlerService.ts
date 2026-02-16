import { chromium, type Browser, type Page } from 'playwright';
import { createLogger } from '../config/logger.js';
import { extractPageData } from './pageExtractor.js';
import { runTechnicalChecks } from './technicalChecks.js';
import type { CrawlOptions, CrawlResult, PageData } from './types.js';
import { DEFAULT_CRAWL_OPTIONS } from './types.js';

const logger = createLogger('crawler');

export class CrawlerService {
  private browser: Browser | null = null;

  async crawl(siteUrl: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResult> {
    const opts: CrawlOptions = { ...DEFAULT_CRAWL_OPTIONS, ...options };
    const baseUrl = new URL(siteUrl);
    const seen = new Set<string>(); // normalized URLs we've visited or queued
    const startNormalized = this.normalizeUrl(baseUrl.href);
    seen.add(startNormalized);
    const queue: string[] = [baseUrl.href];
    const pages: PageData[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    logger.info('Starting crawl', { url: siteUrl, maxPages: opts.maxPages });

    this.browser = await chromium.launch({ headless: true });

    try {
      const technicalChecks = await runTechnicalChecks(baseUrl);

      while (queue.length > 0 && pages.length < opts.maxPages) {
        // Process batch of concurrent pages
        const batch = queue.splice(0, opts.concurrency);
        const batchPromises = batch.map((url) => this.crawlPage(url, baseUrl, opts));
        const results = await Promise.allSettled(batchPromises);

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const url = batch[i];

          if (result.status === 'fulfilled' && result.value) {
            const pageData = result.value;
            pages.push(pageData);

            // Add discovered internal links to queue (deduplicated via normalized set)
            for (const linkPath of pageData.internalLinkUrls) {
              const fullUrl = new URL(linkPath, baseUrl.origin).href;
              const normalized = this.normalizeUrl(fullUrl);
              if (!seen.has(normalized) && pages.length + queue.length < opts.maxPages) {
                seen.add(normalized);
                queue.push(fullUrl);
              }
            }
          } else if (result.status === 'rejected') {
            errors.push({
              url,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            });
          }
        }

        logger.info('Crawl progress', {
          pagesComplete: pages.length,
          queueRemaining: queue.length,
          maxPages: opts.maxPages,
        });
      }

      logger.info('Crawl complete', { totalPages: pages.length, totalErrors: errors.length });

      return { pages, technicalChecks, errors };
    } finally {
      await this.close();
    }
  }

  private async crawlPage(url: string, baseUrl: URL, opts: CrawlOptions): Promise<PageData | null> {
    if (!this.browser) return null;

    const context = await this.browser.newContext({
      userAgent: 'RankPilot SEO Crawler/1.0 (+https://geekatyourspot.com/rankpilot)',
      viewport: { width: 1280, height: 720 },
    });

    const page: Page = await context.newPage();
    const redirectChain: string[] = [];

    // Track redirects
    page.on('response', (response) => {
      if (response.status() >= 300 && response.status() < 400) {
        redirectChain.push(response.url());
      }
    });

    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: opts.timeout,
      });

      const httpStatus = response?.status() ?? 0;

      // Wait for any dynamic content
      await page.waitForTimeout(1000);

      const extractedData = await extractPageData(page, baseUrl);

      return {
        ...extractedData,
        httpStatus,
        redirectChain,
      };
    } catch (error: unknown) {
      logger.warn('Failed to crawl page', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await context.close();
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash, fragment, and common tracking params
      parsed.hash = '';
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      let path = parsed.pathname;
      if (path.endsWith('/') && path.length > 1) {
        path = path.slice(0, -1);
      }
      return `${parsed.origin}${path}${parsed.search}`;
    } catch {
      return url;
    }
  }

  private async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
