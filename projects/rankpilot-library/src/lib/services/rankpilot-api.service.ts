import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  ApiResponse,
  Crawl,
  CrawlPage,
  PaginatedResponse,
  Site,
} from '../models/site.model';

@Injectable({ providedIn: 'root' })
export class RankPilotApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3100/api';

  async createSite(url: string, name: string, crawlDepthLimit?: number): Promise<Site> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<Site>>(`${this.baseUrl}/sites`, { url, name, crawlDepthLimit }),
    );
    return res.data;
  }

  async getSites(): Promise<Site[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Site[]>>(`${this.baseUrl}/sites`),
    );
    return res.data;
  }

  async getSite(id: string): Promise<Site> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Site>>(`${this.baseUrl}/sites/${id}`),
    );
    return res.data;
  }

  async triggerCrawl(siteId: string): Promise<Crawl> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<Crawl>>(`${this.baseUrl}/sites/${siteId}/crawl`, {}),
    );
    return res.data;
  }

  async getCrawl(crawlId: string): Promise<Crawl> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Crawl>>(`${this.baseUrl}/crawls/${crawlId}`),
    );
    return res.data;
  }

  async getCrawlPages(
    crawlId: string,
    page = 1,
    limit = 20,
    sortBy = 'seoScore',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<PaginatedResponse<CrawlPage>> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<PaginatedResponse<CrawlPage>>>(
        `${this.baseUrl}/crawls/${crawlId}/pages`,
        { params: { page, limit, sortBy, sortOrder } },
      ),
    );
    return res.data;
  }

  async getCrawlPage(crawlId: string, pageId: string): Promise<CrawlPage> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<CrawlPage>>(
        `${this.baseUrl}/crawls/${crawlId}/pages/${pageId}`,
      ),
    );
    return res.data;
  }

  getReportUrl(crawlId: string): string {
    return `${this.baseUrl}/crawls/${crawlId}/report`;
  }
}
