import { Component, ChangeDetectionStrategy, signal, inject, OnInit, input } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { RankPilotApiService } from '../../services/rankpilot-api.service';
import { ScoreGaugeComponent } from '../score-gauge/score-gauge.component';
import { PageListComponent } from '../page-list/page-list.component';
import { PageDetailComponent } from '../page-detail/page-detail.component';
import { CrawlProgressComponent } from '../crawl-progress/crawl-progress.component';
import { FixQueueComponent } from '../fix-queue/fix-queue.component';
import type { Site, CrawlPage, Crawl } from '../../models/site.model';

type ViewMode = 'overview' | 'page-detail' | 'crawling';

@Component({
  selector: 'rp-site-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScoreGaugeComponent, PageListComponent, PageDetailComponent, CrawlProgressComponent, FixQueueComponent],
  host: { style: 'display: block' },
  template: `
    <div class="dashboard">
      <header class="dash-header">
        <div>
          <h1>{{ site()?.name ?? 'RankPilot' }}</h1>
          @if (site(); as s) {
            <p class="site-url">{{ s.url }}</p>
          }
        </div>
        <div class="actions">
          @if (view() !== 'crawling') {
            <button class="btn-primary" (click)="startCrawl()" [disabled]="!site()">
              Run SEO Audit
            </button>
          }
          @if (latestCrawlId()) {
            <a class="btn-secondary" [href]="reportUrl()" target="_blank" rel="noopener">
              Download PDF Report
            </a>
          }
        </div>
      </header>

      @if (error()) {
        <div class="error-banner" role="alert">{{ error() }}</div>
      }

      @switch (view()) {
        @case ('crawling') {
          <rp-crawl-progress
            [crawlId]="activeCrawlId()!"
            (crawlComplete)="onCrawlComplete()"
          />
        }
        @case ('page-detail') {
          <button class="btn-back" (click)="view.set('overview')">&larr; Back to overview</button>
          <rp-page-detail [page]="selectedPage()" />
        }
        @case ('overview') {
          @if (latestCrawlId()) {
            <div class="score-section">
              <rp-score-gauge [score]="overallScore()" label="Site Score" />
              @if (previousScore() !== null) {
                <div class="trend">
                  @if (overallScore() > previousScore()!) {
                    <span class="trend-up">+{{ overallScore() - previousScore()! }} pts</span>
                  } @else if (overallScore() < previousScore()!) {
                    <span class="trend-down">{{ overallScore() - previousScore()! }} pts</span>
                  } @else {
                    <span class="trend-flat">No change</span>
                  }
                </div>
              }
            </div>

            <div class="content-grid">
              <div class="main-content">
                <rp-page-list
                  [pages]="pages()"
                  [currentPage]="currentPage()"
                  [totalPages]="totalPages()"
                  (pageSelected)="selectPage($event)"
                  (prevPage)="loadPages(currentPage() - 1)"
                  (nextPage)="loadPages(currentPage() + 1)"
                />
              </div>
              <aside class="sidebar">
                <rp-fix-queue [pages]="pages()" />
              </aside>
            </div>
          } @else {
            <div class="empty-state">
              <h2>No audits yet</h2>
              <p>Click "Run SEO Audit" to crawl your site and get your first report.</p>
            </div>
          }
        }
      }
    </div>
  `,
  styles: `
    :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
    .dashboard { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .dash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .dash-header h1 { margin: 0; font-size: 24px; }
    .site-url { color: #6b7280; font-size: 14px; margin: 4px 0 0; }
    .actions { display: flex; gap: 8px; }
    .btn-primary { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { padding: 10px 20px; background: white; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-weight: 500; cursor: pointer; text-decoration: none; font-size: 14px; }
    .btn-back { padding: 6px 12px; background: none; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; margin-bottom: 16px; }
    .error-banner { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
    .score-section { display: flex; align-items: center; gap: 24px; margin-bottom: 24px; }
    .trend-up { color: #22c55e; font-weight: 600; }
    .trend-down { color: #ef4444; font-weight: 600; }
    .trend-flat { color: #6b7280; }
    .content-grid { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
    .empty-state { text-align: center; padding: 60px 24px; }
    .empty-state h2 { font-size: 20px; margin-bottom: 8px; }
    .empty-state p { color: #6b7280; }
    @media (max-width: 768px) {
      .content-grid { grid-template-columns: 1fr; }
      .dash-header { flex-direction: column; gap: 12px; }
    }
  `,
})
export class SiteDashboardComponent implements OnInit {
  readonly siteId = input<string>('');

  private readonly api = inject(RankPilotApiService);

  readonly site = signal<Site | null>(null);
  readonly pages = signal<CrawlPage[]>([]);
  readonly selectedPage = signal<CrawlPage | null>(null);
  readonly view = signal<ViewMode>('overview');
  readonly error = signal('');
  readonly activeCrawlId = signal<string | null>(null);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly overallScore = signal(0);
  readonly previousScore = signal<number | null>(null);
  readonly latestCrawlId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    if (this.siteId()) {
      await this.loadSite();
    }
  }

  private async loadSite(): Promise<void> {
    try {
      const site = await this.api.getSite(this.siteId());
      this.site.set(site);

      const latestCrawl = site.crawls?.at(0);
      if (latestCrawl && latestCrawl.status === 'COMPLETE') {
        this.latestCrawlId.set(latestCrawl.id);
        this.overallScore.set(latestCrawl.overallScore ?? 0);
        this.previousScore.set(latestCrawl.previousScore);
        await this.loadPages(1);
      }
    } catch {
      this.error.set('Failed to load site data.');
    }
  }

  async loadPages(page: number): Promise<void> {
    const crawlId = this.latestCrawlId();
    if (!crawlId) return;

    try {
      const result = await this.api.getCrawlPages(crawlId, page, 20, 'seoScore', 'asc');
      this.pages.set(result.pages);
      this.currentPage.set(result.pagination.page);
      this.totalPages.set(result.pagination.totalPages);
    } catch {
      this.error.set('Failed to load pages.');
    }
  }

  async selectPage(pageId: string): Promise<void> {
    const crawlId = this.latestCrawlId();
    if (!crawlId) return;

    try {
      const page = await this.api.getCrawlPage(crawlId, pageId);
      this.selectedPage.set(page);
      this.view.set('page-detail');
    } catch {
      this.error.set('Failed to load page details.');
    }
  }

  async startCrawl(): Promise<void> {
    const site = this.site();
    if (!site) return;

    try {
      this.error.set('');
      const crawl = await this.api.triggerCrawl(site.id);
      this.activeCrawlId.set(crawl.id);
      this.view.set('crawling');
    } catch {
      this.error.set('Failed to start crawl.');
    }
  }

  async onCrawlComplete(): Promise<void> {
    this.view.set('overview');
    await this.loadSite();
  }

  reportUrl(): string {
    const crawlId = this.latestCrawlId();
    return crawlId ? this.api.getReportUrl(crawlId) : '';
  }
}
