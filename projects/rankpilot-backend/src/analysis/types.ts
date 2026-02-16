export interface SeoIssue {
  category: 'title' | 'meta_description' | 'headings' | 'content' | 'images' | 'links' | 'mobile' | 'technical';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  currentValue?: string;
  recommendedValue?: string;
  impact: number; // 1-10 how much this affects SEO score
}

export interface SeoFix {
  issue: string;
  currentState: string;
  recommendation: string;
  aiGeneratedFix: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PageScore {
  overall: number; // 0-100
  breakdown: {
    title: number;
    metaDescription: number;
    headings: number;
    content: number;
    images: number;
    links: number;
    mobile: number;
    technical: number;
  };
  issues: SeoIssue[];
}
