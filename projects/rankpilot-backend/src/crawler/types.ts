export interface CrawlOptions {
  maxPages: number;
  concurrency: number;
  respectRobotsTxt: boolean;
  timeout: number;
  onProgress?: (pagesDiscovered: number) => Promise<void>;
}

export interface PageData {
  url: string;
  httpStatus: number;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  h2s: string[];
  wordCount: number;
  imageCount: number;
  imagesWithoutAlt: number;
  internalLinks: number;
  externalLinks: number;
  canonicalUrl: string | null;
  ogTags: Record<string, string>;
  structuredData: unknown[];
  hasViewportMeta: boolean;
  isIndexable: boolean;
  redirectChain: string[];
  internalLinkUrls: string[];
}

export interface TechnicalCheckResult {
  hasRobotsTxt: boolean;
  robotsTxtContent: string | null;
  hasSitemap: boolean;
  sitemapUrl: string | null;
  sslValid: boolean;
  sslExpiresAt: string | null;
}

export interface CrawlResult {
  pages: PageData[];
  technicalChecks: TechnicalCheckResult;
  errors: Array<{ url: string; error: string }>;
}

export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxPages: 50,
  concurrency: 3,
  respectRobotsTxt: true,
  timeout: 30_000,
};
