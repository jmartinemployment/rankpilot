import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import type { CrawlPage } from '../../models/site.model';

@Component({
  selector: 'rp-page-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
  template: `
    <div class="page-list">
      <table class="table">
        <thead>
          <tr>
            <th>URL</th>
            <th class="text-center">Score</th>
            <th class="text-center">Status</th>
            <th class="text-center">Words</th>
            <th class="text-center">Issues</th>
          </tr>
        </thead>
        <tbody>
          @for (page of pages(); track page.id) {
            <tr class="page-row" (click)="pageSelected.emit(page.id)" (keydown.enter)="pageSelected.emit(page.id)" tabindex="0" role="button">
              <td class="url-cell" [title]="page.url">{{ shortenUrl(page.url) }}</td>
              <td class="text-center">
                <span class="score-badge" [class]="scoreClass(page.seoScore)">
                  {{ page.seoScore ?? '-' }}
                </span>
              </td>
              <td class="text-center">{{ page.httpStatus ?? '-' }}</td>
              <td class="text-center">{{ page.wordCount }}</td>
              <td class="text-center">{{ page.issues?.length ?? 0 }}</td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">No pages found.</td></tr>
          }
        </tbody>
      </table>

      @if (totalPages() > 1) {
        <div class="pagination">
          <button [disabled]="currentPage() <= 1" (click)="prevPage.emit()">Previous</button>
          <span>Page {{ currentPage() }} of {{ totalPages() }}</span>
          <button [disabled]="currentPage() >= totalPages()" (click)="nextPage.emit()">Next</button>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    th { background: #f9fafb; font-weight: 600; font-size: 13px; }
    .text-center { text-align: center; }
    .page-row { cursor: pointer; }
    .page-row:hover { background: #f3f4f6; }
    .url-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .score-badge { padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 13px; }
    .score-good { background: #dcfce7; color: #166534; }
    .score-warning { background: #fef3c7; color: #92400e; }
    .score-bad { background: #fee2e2; color: #991b1b; }
    .empty { text-align: center; color: #6b7280; padding: 24px; }
    .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 16px; }
    .pagination button { padding: 6px 16px; border: 1px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; }
    .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
  `,
})
export class PageListComponent {
  readonly pages = input<CrawlPage[]>([]);
  readonly currentPage = input(1);
  readonly totalPages = input(1);

  readonly pageSelected = output<string>();
  readonly prevPage = output<void>();
  readonly nextPage = output<void>();

  scoreClass(score: number | null): string {
    if (score === null) return '';
    if (score >= 80) return 'score-good';
    if (score >= 50) return 'score-warning';
    return 'score-bad';
  }

  shortenUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname + parsed.search;
    } catch {
      return url;
    }
  }
}
