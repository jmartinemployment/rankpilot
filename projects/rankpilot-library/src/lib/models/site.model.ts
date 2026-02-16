export interface Site {
  id: string;
  url: string;
  name: string;
  crawlDepthLimit: number;
  createdAt: string;
  updatedAt: string;
  crawls?: CrawlSummary[];
}

export interface CrawlSummary {
  id: string;
  status: CrawlStatus;
  overallScore: number | null;
  previousScore: number | null;
  pageCount: number;
  completedAt: string | null;
}

export type CrawlStatus = 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';

export interface Crawl {
  id: string;
  siteId: string;
  status: CrawlStatus;
  startedAt: string | null;
  completedAt: string | null;
  pageCount: number;
  overallScore: number | null;
  previousScore: number | null;
  errorMessage: string | null;
  createdAt: string;
  site?: { id: string; url: string; name: string };
  _count?: { pages: number };
}

export interface CrawlPage {
  id: string;
  crawlId: string;
  url: string;
  httpStatus: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number;
  imageCount: number;
  imagesWithoutAlt: number;
  internalLinks: number;
  hasViewportMeta: boolean;
  seoScore: number | null;
  issues: SeoIssue[];
  fixes: SeoFix[];
}

export interface SeoIssue {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  currentValue?: string;
  recommendedValue?: string;
  impact: number;
}

export interface SeoFix {
  issue: string;
  currentState: string;
  recommendation: string;
  aiGeneratedFix: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PaginatedResponse<T> {
  pages: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string; code?: string };
}
