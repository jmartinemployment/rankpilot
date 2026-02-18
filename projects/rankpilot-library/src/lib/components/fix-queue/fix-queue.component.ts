import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import type { CrawlPage, SeoIssue } from '../../models/site.model';

interface PageIssue extends SeoIssue {
  pageUrl: string;
  pageId: string;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

@Component({
  selector: 'rp-fix-queue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
  template: `
    <div class="issue-queue">
      <div class="queue-header">
        <h3>Issues</h3>
        <span class="counter">{{ sortedIssues().length }} found</span>
      </div>

      @for (issue of sortedIssues(); track $index) {
        <div class="issue-item">
          <span class="severity-dot" [class]="'dot-' + issue.severity"></span>
          <div class="issue-content">
            <div class="issue-message">{{ issue.message }}</div>
            <div class="issue-meta">
              <span class="issue-page">{{ shortenUrl(issue.pageUrl) }}</span>
              <span class="issue-category">{{ issue.category }}</span>
            </div>
          </div>
        </div>
      } @empty {
        <div class="empty">No issues found. Great job!</div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .queue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .queue-header h3 { margin: 0; font-size: 16px; }
    .counter { font-size: 13px; color: #6b7280; }
    .issue-item { display: flex; align-items: flex-start; gap: 8px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px; }
    .severity-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .dot-critical { background: #ef4444; }
    .dot-warning { background: #f59e0b; }
    .dot-info { background: #3b82f6; }
    .issue-content { flex: 1; min-width: 0; }
    .issue-message { font-size: 14px; font-weight: 500; }
    .issue-meta { display: flex; gap: 8px; margin-top: 4px; }
    .issue-page { font-size: 12px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .issue-category { font-size: 11px; color: #9ca3af; background: #f3f4f6; padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
    .empty { text-align: center; color: #6b7280; padding: 24px; }
  `,
})
export class FixQueueComponent {
  readonly pages = input<CrawlPage[]>([]);

  readonly sortedIssues = computed<PageIssue[]>(() => {
    const queue: PageIssue[] = [];
    for (const page of this.pages()) {
      for (const issue of page.issues ?? []) {
        queue.push({ ...issue, pageUrl: page.url, pageId: page.id });
      }
    }
    queue.sort((a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2)
      || b.impact - a.impact,
    );
    return queue;
  });

  shortenUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url;
    }
  }
}
