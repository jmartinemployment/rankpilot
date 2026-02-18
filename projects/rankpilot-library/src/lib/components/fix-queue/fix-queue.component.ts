import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import type { CrawlPage, SeoIssue } from '../../models/site.model';

interface PageGroup {
  pageUrl: string;
  score: number | null;
  issues: SeoIssue[];
}

@Component({
  selector: 'rp-fix-queue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
  template: `
    <div class="issue-panel">
      <div class="panel-header">
        <h3>Issues</h3>
        <span class="counter">{{ totalCount() }} across {{ groupedIssues().length }} pages</span>
      </div>

      <div class="issue-list">
        @for (group of groupedIssues(); track group.pageUrl) {
          <div class="page-group">
            <div class="page-header">
              <span class="page-url">{{ shortenUrl(group.pageUrl) }}</span>
              <span class="page-score">{{ group.score ?? '—' }}</span>
            </div>
            @for (issue of group.issues; track $index) {
              <div class="issue-row">
                <span class="severity-dot" [class]="'dot-' + issue.severity"></span>
                <span class="issue-msg">{{ issue.message }}</span>
              </div>
            }
          </div>
        } @empty {
          <div class="empty">No issues found. Great job!</div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .panel-header h3 { margin: 0; font-size: 16px; }
    .counter { font-size: 13px; color: #6b7280; }
    .issue-list { max-height: 600px; overflow-y: auto; }
    .page-group { margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .page-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .page-url { font-size: 13px; font-weight: 600; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
    .page-score { font-size: 12px; font-weight: 600; color: #6b7280; background: white; border: 1px solid #e5e7eb; border-radius: 4px; padding: 1px 6px; margin-left: 8px; flex-shrink: 0; }
    .issue-row { display: flex; align-items: flex-start; gap: 6px; padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
    .issue-row:last-child { border-bottom: none; }
    .severity-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
    .dot-critical { background: #ef4444; }
    .dot-warning { background: #f59e0b; }
    .dot-info { background: #3b82f6; }
    .issue-msg { font-size: 13px; color: #4b5563; }
    .empty { text-align: center; color: #6b7280; padding: 24px; }
  `,
})
export class FixQueueComponent {
  readonly pages = input<CrawlPage[]>([]);

  readonly groupedIssues = computed<PageGroup[]>(() => {
    const groups: PageGroup[] = [];
    for (const page of this.pages()) {
      const issues = page.issues ?? [];
      if (issues.length === 0) continue;
      groups.push({
        pageUrl: page.url,
        score: page.seoScore,
        issues: [...issues].sort((a, b) => {
          const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
          return (order[a.severity] ?? 2) - (order[b.severity] ?? 2) || b.impact - a.impact;
        }),
      });
    }
    groups.sort((a, b) => (a.score ?? 100) - (b.score ?? 100));
    return groups;
  });

  readonly totalCount = computed(() =>
    this.groupedIssues().reduce((sum, g) => sum + g.issues.length, 0),
  );

  shortenUrl(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
}
