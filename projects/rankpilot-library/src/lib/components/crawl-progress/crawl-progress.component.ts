import { Component, ChangeDetectionStrategy, input, output, computed, OnInit, OnDestroy, signal, inject } from '@angular/core';
import type { CrawlStatus } from '../../models/site.model';
import { RankPilotApiService } from '../../services/rankpilot-api.service';

@Component({
  selector: 'rp-crawl-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
  template: `
    <div class="crawl-progress" [class]="'status-' + status()">
      <div class="status-indicator">
        @if (status() === 'RUNNING' || status() === 'PENDING') {
          <span class="spinner"></span>
        }
        <span class="status-text">{{ statusLabel() }}</span>
      </div>
      @if (status() === 'COMPLETE') {
        <div class="result">
          <span>{{ pageCount() }} pages crawled</span>
        </div>
      }
      @if (status() === 'FAILED') {
        <div class="error">Crawl failed. Please try again.</div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .crawl-progress { padding: 16px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb; }
    .status-indicator { display: flex; align-items: center; gap: 8px; }
    .spinner { width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status-text { font-weight: 600; }
    .status-COMPLETE { border-color: #22c55e; }
    .status-FAILED { border-color: #ef4444; }
    .error { color: #ef4444; margin-top: 8px; }
    .result { margin-top: 8px; color: #6b7280; }
  `,
})
export class CrawlProgressComponent implements OnInit, OnDestroy {
  readonly crawlId = input.required<string>();
  readonly crawlComplete = output<void>();

  private readonly api = inject(RankPilotApiService);
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  readonly status = signal<CrawlStatus>('PENDING');
  readonly pageCount = signal(0);

  readonly statusLabel = computed(() => {
    const s = this.status();
    if (s === 'PENDING') return 'Waiting to start...';
    if (s === 'RUNNING') return 'Crawling...';
    if (s === 'COMPLETE') return 'Complete';
    return 'Failed';
  });

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.checkStatus();
    }, 3000);
    this.checkStatus();
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async checkStatus(): Promise<void> {
    try {
      const crawl = await this.api.getCrawl(this.crawlId());
      this.status.set(crawl.status);
      this.pageCount.set(crawl.pageCount);

      if (crawl.status === 'COMPLETE' || crawl.status === 'FAILED') {
        this.stopPolling();
        if (crawl.status === 'COMPLETE') {
          this.crawlComplete.emit();
        }
      }
    } catch {
      // Keep polling on transient errors
    }
  }
}
