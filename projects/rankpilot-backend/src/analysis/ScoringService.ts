import type { PageData } from '../crawler/types.js';
import type { PageScore, SeoIssue } from './types.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger('scoring');

const WEIGHTS = {
  title: 20,
  metaDescription: 15,
  headings: 10,
  content: 20,
  images: 10,
  links: 10,
  mobile: 10,
  technical: 5,
} as const;

export class ScoringService {
  scorePage(page: PageData): PageScore {
    const issues: SeoIssue[] = [];

    const titleScore = this.scoreTitle(page, issues);
    const metaDescScore = this.scoreMetaDescription(page, issues);
    const headingsScore = this.scoreHeadings(page, issues);
    const contentScore = this.scoreContent(page, issues);
    const imagesScore = this.scoreImages(page, issues);
    const linksScore = this.scoreLinks(page, issues);
    const mobileScore = this.scoreMobile(page, issues);
    const technicalScore = this.scoreTechnical(page, issues);

    const breakdown = {
      title: titleScore,
      metaDescription: metaDescScore,
      headings: headingsScore,
      content: contentScore,
      images: imagesScore,
      links: linksScore,
      mobile: mobileScore,
      technical: technicalScore,
    };

    const overall = Math.round(
      (titleScore * WEIGHTS.title +
        metaDescScore * WEIGHTS.metaDescription +
        headingsScore * WEIGHTS.headings +
        contentScore * WEIGHTS.content +
        imagesScore * WEIGHTS.images +
        linksScore * WEIGHTS.links +
        mobileScore * WEIGHTS.mobile +
        technicalScore * WEIGHTS.technical) / 100
    );

    logger.debug('Page scored', { url: page.url, score: overall });

    return { overall, breakdown, issues };
  }

  calculateSiteScore(pageScores: PageScore[]): number {
    if (pageScores.length === 0) return 0;
    const total = pageScores.reduce((sum, ps) => sum + ps.overall, 0);
    return Math.round(total / pageScores.length);
  }

  private scoreTitle(page: PageData, issues: SeoIssue[]): number {
    if (!page.title) {
      issues.push({
        category: 'title',
        severity: 'critical',
        message: 'Page is missing a title tag',
        impact: 10,
      });
      return 0;
    }

    let score = 100;
    const length = page.title.length;

    if (length < 30) {
      score -= 30;
      issues.push({
        category: 'title',
        severity: 'warning',
        message: `Title tag is too short (${length} characters). Recommended: 50-60 characters.`,
        currentValue: page.title,
        impact: 6,
      });
    } else if (length > 60) {
      score -= 20;
      issues.push({
        category: 'title',
        severity: 'warning',
        message: `Title tag is too long (${length} characters). It may be truncated in search results. Recommended: 50-60 characters.`,
        currentValue: page.title,
        impact: 4,
      });
    }

    if (page.title.toLowerCase() === 'home' || page.title.toLowerCase() === 'untitled') {
      score -= 40;
      issues.push({
        category: 'title',
        severity: 'critical',
        message: 'Title tag is generic and not descriptive.',
        currentValue: page.title,
        impact: 8,
      });
    }

    return Math.max(0, score);
  }

  private scoreMetaDescription(page: PageData, issues: SeoIssue[]): number {
    if (!page.metaDescription) {
      issues.push({
        category: 'meta_description',
        severity: 'critical',
        message: 'Page is missing a meta description.',
        impact: 8,
      });
      return 0;
    }

    let score = 100;
    const length = page.metaDescription.length;

    if (length < 120) {
      score -= 25;
      issues.push({
        category: 'meta_description',
        severity: 'warning',
        message: `Meta description is too short (${length} characters). Recommended: 150-160 characters.`,
        currentValue: page.metaDescription,
        impact: 5,
      });
    } else if (length > 160) {
      score -= 15;
      issues.push({
        category: 'meta_description',
        severity: 'info',
        message: `Meta description is too long (${length} characters). It may be truncated. Recommended: 150-160 characters.`,
        currentValue: page.metaDescription,
        impact: 3,
      });
    }

    return Math.max(0, score);
  }

  private scoreHeadings(page: PageData, issues: SeoIssue[]): number {
    let score = 100;

    if (!page.h1) {
      score -= 50;
      issues.push({
        category: 'headings',
        severity: 'critical',
        message: 'Page is missing an H1 heading.',
        impact: 7,
      });
    }

    if (page.h2s.length === 0) {
      score -= 20;
      issues.push({
        category: 'headings',
        severity: 'warning',
        message: 'Page has no H2 subheadings. Use H2s to structure content.',
        impact: 4,
      });
    }

    return Math.max(0, score);
  }

  private scoreContent(page: PageData, issues: SeoIssue[]): number {
    let score = 100;

    if (page.wordCount < 100) {
      score -= 60;
      issues.push({
        category: 'content',
        severity: 'critical',
        message: `Very thin content (${page.wordCount} words). Minimum recommended: 300 words.`,
        impact: 9,
      });
    } else if (page.wordCount < 300) {
      score -= 30;
      issues.push({
        category: 'content',
        severity: 'warning',
        message: `Content is thin (${page.wordCount} words). Recommended: 300+ words for better ranking.`,
        impact: 6,
      });
    }

    return Math.max(0, score);
  }

  private scoreImages(page: PageData, issues: SeoIssue[]): number {
    if (page.imageCount === 0) return 100; // No images is fine

    let score = 100;
    const missingAltRatio = page.imagesWithoutAlt / page.imageCount;

    if (missingAltRatio > 0.5) {
      score -= 50;
      issues.push({
        category: 'images',
        severity: 'critical',
        message: `${page.imagesWithoutAlt} of ${page.imageCount} images are missing alt text.`,
        impact: 6,
      });
    } else if (page.imagesWithoutAlt > 0) {
      score -= 20;
      issues.push({
        category: 'images',
        severity: 'warning',
        message: `${page.imagesWithoutAlt} of ${page.imageCount} images are missing alt text.`,
        impact: 4,
      });
    }

    return Math.max(0, score);
  }

  private scoreLinks(page: PageData, issues: SeoIssue[]): number {
    let score = 100;

    if (page.internalLinks === 0) {
      score -= 40;
      issues.push({
        category: 'links',
        severity: 'warning',
        message: 'Page has no internal links. Internal linking helps search engines discover and rank pages.',
        impact: 5,
      });
    }

    return Math.max(0, score);
  }

  private scoreMobile(page: PageData, issues: SeoIssue[]): number {
    let score = 100;

    if (!page.hasViewportMeta) {
      score -= 70;
      issues.push({
        category: 'mobile',
        severity: 'critical',
        message: 'Page is missing the viewport meta tag. This is required for mobile-friendly rendering.',
        impact: 9,
      });
    }

    return Math.max(0, score);
  }

  private scoreTechnical(page: PageData, issues: SeoIssue[]): number {
    let score = 100;

    if (page.httpStatus >= 400) {
      score -= 80;
      issues.push({
        category: 'technical',
        severity: 'critical',
        message: `Page returned HTTP ${page.httpStatus} error.`,
        impact: 10,
      });
    } else if (page.httpStatus >= 300) {
      score -= 20;
      issues.push({
        category: 'technical',
        severity: 'warning',
        message: `Page has a redirect (HTTP ${page.httpStatus}).`,
        impact: 3,
      });
    }

    if (page.redirectChain.length > 1) {
      score -= 15;
      issues.push({
        category: 'technical',
        severity: 'warning',
        message: `Page has a redirect chain of ${page.redirectChain.length} hops. Keep redirects to a single hop.`,
        impact: 4,
      });
    }

    if (!page.isIndexable) {
      issues.push({
        category: 'technical',
        severity: 'info',
        message: 'Page is marked as noindex and will not appear in search results.',
        impact: 1,
      });
    }

    return Math.max(0, score);
  }
}
