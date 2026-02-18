import { Component, ChangeDetectionStrategy, input, computed, linkedSignal } from '@angular/core';
import type { CrawlPage, SeoFix } from '../../models/site.model';

interface QueuedFix extends SeoFix {
  pageUrl: string;
  pageId: string;
  done: boolean;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

@Component({
  selector: 'rp-fix-queue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
  template: `
    <div class="fix-queue">
      <div class="queue-header">
        <h3>Fix Queue</h3>
        <span class="counter">{{ remainingCount() }} remaining</span>
      </div>

      @for (fix of sortedFixes(); track $index) {
        <div class="fix-item" [class.done]="fix.done">
          <label class="checkbox-label">
            <input type="checkbox" [checked]="fix.done" (change)="toggleFix($index)" />
            <div class="fix-content">
              <span class="priority-dot" [class]="'dot-' + fix.priority"></span>
              <div>
                <div class="fix-title">{{ fix.issue }}</div>
                <div class="fix-page">{{ shortenUrl(fix.pageUrl) }}</div>
              </div>
            </div>
          </label>
        </div>
      } @empty {
        <div class="empty">No fixes needed. Great job!</div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .queue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .queue-header h3 { margin: 0; font-size: 16px; }
    .counter { font-size: 13px; color: #6b7280; }
    .fix-item { padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px; }
    .fix-item.done { opacity: 0.5; }
    .checkbox-label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
    .fix-content { display: flex; align-items: flex-start; gap: 8px; }
    .fix-title { font-size: 14px; font-weight: 500; }
    .fix-page { font-size: 12px; color: #6b7280; }
    .priority-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .dot-high { background: #ef4444; }
    .dot-medium { background: #f59e0b; }
    .dot-low { background: #3b82f6; }
    .empty { text-align: center; color: #6b7280; padding: 24px; }
  `,
})
export class FixQueueComponent {
  readonly pages = input<CrawlPage[]>([]);

  readonly fixes = linkedSignal<CrawlPage[], QueuedFix[]>({
    source: this.pages,
    computation: (pages) => {
      const queue: QueuedFix[] = [];
      for (const page of pages) {
        for (const fix of page.fixes ?? []) {
          queue.push({ ...fix, pageUrl: page.url, pageId: page.id, done: false });
        }
      }
      queue.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
      return queue;
    },
  });

  readonly sortedFixes = this.fixes.asReadonly();

  readonly remainingCount = computed(() =>
    this.fixes().filter((f) => !f.done).length,
  );

  toggleFix(index: number): void {
    this.fixes.update((fixes) =>
      fixes.map((f, i) => (i === index ? { ...f, done: !f.done } : f)),
    );
  }

  shortenUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url;
    }
  }
}
