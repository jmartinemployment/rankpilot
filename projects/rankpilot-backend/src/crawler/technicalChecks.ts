import type { TechnicalCheckResult } from './types.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger('technical-checks');

export async function runTechnicalChecks(baseUrl: URL): Promise<TechnicalCheckResult> {
  const [robotsResult, sitemapResult, sslResult] = await Promise.all([
    checkRobotsTxt(baseUrl),
    checkSitemap(baseUrl),
    checkSsl(baseUrl),
  ]);

  return {
    ...robotsResult,
    ...sitemapResult,
    ...sslResult,
  };
}

async function checkRobotsTxt(baseUrl: URL): Promise<Pick<TechnicalCheckResult, 'hasRobotsTxt' | 'robotsTxtContent'>> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl.origin);
    const response = await fetch(robotsUrl.href, { signal: AbortSignal.timeout(10_000) });
    if (response.ok) {
      const content = await response.text();
      return { hasRobotsTxt: true, robotsTxtContent: content };
    }
    return { hasRobotsTxt: false, robotsTxtContent: null };
  } catch (error: unknown) {
    logger.warn('Failed to check robots.txt', { error: error instanceof Error ? error.message : String(error) });
    return { hasRobotsTxt: false, robotsTxtContent: null };
  }
}

async function checkSitemap(baseUrl: URL): Promise<Pick<TechnicalCheckResult, 'hasSitemap' | 'sitemapUrl'>> {
  const sitemapPaths = ['/sitemap.xml', '/sitemap_index.xml'];

  for (const path of sitemapPaths) {
    try {
      const sitemapUrl = new URL(path, baseUrl.origin);
      const response = await fetch(sitemapUrl.href, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        return { hasSitemap: true, sitemapUrl: sitemapUrl.href };
      }
    } catch {
      // Try next path
    }
  }

  return { hasSitemap: false, sitemapUrl: null };
}

async function checkSsl(baseUrl: URL): Promise<Pick<TechnicalCheckResult, 'sslValid' | 'sslExpiresAt'>> {
  // Basic SSL check — verify the site responds on HTTPS without errors
  try {
    const httpsUrl = new URL(baseUrl.href);
    httpsUrl.protocol = 'https:';
    const response = await fetch(httpsUrl.href, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
    });
    return { sslValid: response.ok || response.status < 500, sslExpiresAt: null };
  } catch {
    return { sslValid: false, sslExpiresAt: null };
  }
}
