import { Component, ChangeDetectionStrategy, input, output, computed, OnInit, OnDestroy, signal, inject } from '@angular/core';
import type { CrawlStatus } from '../../models/site.model';
import { RankPilotApiService } from '../../services/rankpilot-api.service';

@Component({
  selector: 'rp-crawl-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
  template: `
    <div class="crawl-progress" [class]="'status-' + status()">
      @if (status() === 'COMPLETE') {
        <div class="status-indicator">
          <span class="check-icon">&#10003;</span>
          <span class="status-text">Audit Complete</span>
        </div>
        <div class="summary">
          {{ pageCount() }} pages crawled and analyzed
        </div>
      } @else if (status() === 'FAILED') {
        <div class="status-indicator">
          <span class="fail-icon">&#10007;</span>
          <span class="status-text">Audit Failed</span>
        </div>
        <div class="error">Something went wrong. Please try again.</div>
      } @else {
        <div class="status-indicator">
          <span class="spinner"></span>
          <span class="status-text">{{ statusLabel() }}</span>
        </div>

        @if (siteUrl()) {
          <div class="crawl-site">{{ siteUrl() }}</div>
        }

        <div class="steps">
          <div class="step" [class.active]="pagesAnalyzed() === 0" [class.done]="pagesAnalyzed() > 0">
            <span class="step-icon">
              @if (pagesAnalyzed() > 0) { &#10003; } @else { 1 }
            </span>
            <div class="step-content">
              <span class="step-label">Discovering pages</span>
              @if (pageCount() > 0) {
                <span class="step-detail">{{ pageCount() }} pages found</span>
              }
            </div>
          </div>
          <div class="step" [class.active]="pagesAnalyzed() > 0">
            <span class="step-icon">2</span>
            <div class="step-content">
              <span class="step-label">Scoring &amp; generating AI fixes</span>
              @if (pagesAnalyzed() > 0) {
                <span class="step-detail">{{ pagesAnalyzed() }} of {{ pageCount() }} pages analyzed</span>
              }
            </div>
          </div>
        </div>

        <div class="progress-bar-track">
          <div class="progress-bar-fill" [style.width]="progressWidth()"></div>
        </div>

        <div class="elapsed">{{ elapsedLabel() }}</div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .crawl-progress { padding: 28px; border-radius: 12px; background: #f9fafb; border: 1px solid #e5e7eb; max-width: 520px; margin: 40px auto; }
    .status-indicator { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .spinner { width: 22px; height: 22px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .check-icon { color: #22c55e; font-size: 22px; font-weight: bold; }
    .fail-icon { color: #ef4444; font-size: 22px; font-weight: bold; }
    .status-text { font-weight: 600; font-size: 18px; }
    .crawl-site { color: #6b7280; font-size: 14px; margin-bottom: 20px; word-break: break-all; }
    .steps { display: flex; flex-direction: column; gap: 14px; margin: 20px 0; }
    .step { display: flex; align-items: flex-start; gap: 12px; opacity: 0.4; }
    .step.active, .step.done { opacity: 1; }
    .step-icon { width: 28px; height: 28px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #6b7280; flex-shrink: 0; }
    .step.active .step-icon { background: #2563eb; color: white; }
    .step.done .step-icon { background: #22c55e; color: white; }
    .step-content { display: flex; flex-direction: column; gap: 2px; padding-top: 3px; }
    .step-label { font-weight: 600; font-size: 14px; color: #1f2937; }
    .step-detail { font-size: 13px; color: #6b7280; }
    .progress-bar-track { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
    .progress-bar-fill { height: 100%; background: #3b82f6; border-radius: 3px; transition: width 0.5s ease; min-width: 2%; }
    .elapsed { margin-top: 12px; font-size: 13px; color: #9ca3af; text-align: center; }
    .summary { color: #374151; font-size: 15px; margin-top: 4px; }
    .status-COMPLETE { border-color: #22c55e; background: #f0fdf4; }
    .status-FAILED { border-color: #ef4444; background: #fef2f2; }
    .error { color: #ef4444; margin-top: 8px; }
  `,
})
export class CrawlProgressComponent implements OnInit, OnDestroy {
  readonly crawlId = input.required<string>();
  readonly siteUrl = input<string>('');
  readonly crawlComplete = output<void>();

  private readonly api = inject(RankPilotApiService);
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;

  readonly status = signal<CrawlStatus>('PENDING');
  readonly pageCount = signal(0);
  readonly pagesAnalyzed = signal(0);
  readonly elapsedSeconds = signal(0);

  readonly statusLabel = computed(() => {
    const s = this.status();
    if (s === 'PENDING') return 'Starting audit...';
    if (s === 'RUNNING' && this.pagesAnalyzed() > 0) return 'Analyzing pages...';
    if (s === 'RUNNING') return 'Crawling website...';
    if (s === 'COMPLETE') return 'Audit Complete';
    return 'Audit Failed';
  });

  readonly progressWidth = computed(() => {
    const total = this.pageCount();
    const analyzed = this.pagesAnalyzed();
    if (total === 0) return '5%';
    const pct = Math.round((analyzed / total) * 100);
    return `${Math.max(pct, 5)}%`;
  });

  readonly elapsedLabel = computed(() => {
    const s = this.elapsedSeconds();
    if (s < 60) return `${s}s elapsed`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s elapsed`;
  });

  ngOnInit(): void {
    this.startTime = Date.now();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.elapsedSeconds.set(Math.floor((Date.now() - this.startTime) / 1000));
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
      this.pagesAnalyzed.set(crawl._count?.pages ?? 0);

      if (crawl.status === 'COMPLETE' || crawl.status === 'FAILED') {
        this.elapsedSeconds.set(Math.floor((Date.now() - this.startTime) / 1000));
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
