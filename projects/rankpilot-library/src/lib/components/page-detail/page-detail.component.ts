import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import type { CrawlPage } from '../../models/site.model';
import { ScoreGaugeComponent } from '../score-gauge/score-gauge.component';

@Component({
  selector: 'rp-page-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScoreGaugeComponent],
  host: { style: 'display: block' },
  template: `
    @if (page(); as p) {
      <div class="page-detail">
        <div class="header">
          <rp-score-gauge [score]="p.seoScore ?? 0" label="Page Score" />
          <div class="meta">
            <h2>{{ p.url }}</h2>
            <div class="meta-row"><strong>Title:</strong> {{ p.title ?? '(missing)' }}</div>
            <div class="meta-row"><strong>Meta Description:</strong> {{ p.metaDescription ?? '(missing)' }}</div>
            <div class="meta-row"><strong>H1:</strong> {{ p.h1 ?? '(missing)' }}</div>
            <div class="meta-row"><strong>Words:</strong> {{ p.wordCount }} | <strong>Images:</strong> {{ p.imageCount }} ({{ p.imagesWithoutAlt }} missing alt)</div>
          </div>
        </div>

        @if (p.issues?.length) {
          <h3>Issues ({{ p.issues.length }})</h3>
          <div class="issues">
            @for (issue of p.issues; track $index) {
              <div class="issue" [class]="'severity-' + issue.severity">
                <span class="severity-badge">{{ issue.severity }}</span>
                <span>{{ issue.message }}</span>
              </div>
            }
          </div>
        }

        @if (p.fixes?.length) {
          <h3>AI-Generated Fixes ({{ p.fixes.length }})</h3>
          <div class="fixes">
            @for (fix of p.fixes; track $index) {
              <div class="fix-card">
                <div class="fix-header">
                  <span class="priority-badge" [class]="'priority-' + fix.priority">{{ fix.priority }}</span>
                  <strong>{{ fix.issue }}</strong>
                </div>
                <div class="fix-body">
                  <div><strong>Current:</strong> {{ fix.currentState }}</div>
                  <div><strong>Recommendation:</strong> {{ fix.recommendation }}</div>
                  <div class="fix-value">
                    <strong>Fix:</strong>
                    <code>{{ fix.aiGeneratedFix }}</code>
                    <button class="copy-btn" (click)="copyToClipboard(fix.aiGeneratedFix)" [attr.aria-label]="'Copy fix: ' + fix.issue">
                      {{ copiedIndex() === $index ? 'Copied!' : 'Copy' }}
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .header { display: flex; gap: 24px; align-items: flex-start; margin-bottom: 24px; }
    .meta { flex: 1; }
    .meta h2 { font-size: 16px; word-break: break-all; margin: 0 0 8px; }
    .meta-row { font-size: 14px; color: #374151; margin-bottom: 4px; }
    h3 { font-size: 16px; margin: 24px 0 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .issue { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; margin-bottom: 4px; font-size: 14px; }
    .severity-critical { background: #fee2e2; }
    .severity-warning { background: #fef3c7; }
    .severity-info { background: #f0f9ff; }
    .severity-badge { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
    .fix-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
    .fix-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .fix-body { font-size: 14px; }
    .fix-body > div { margin-bottom: 4px; }
    .fix-value { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .fix-value code { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
    .copy-btn { padding: 4px 10px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; cursor: pointer; }
    .copy-btn:hover { background: #f3f4f6; }
    .priority-badge { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-low { background: #f0f9ff; color: #1e40af; }
  `,
})
export class PageDetailComponent {
  readonly page = input<CrawlPage | null>(null);

  readonly copiedIndex = signal<number | null>(null);

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      // Find the index of the fix that was copied
      const fixes = this.page()?.fixes ?? [];
      const idx = fixes.findIndex((f) => f.aiGeneratedFix === text);
      this.copiedIndex.set(idx);
      setTimeout(() => this.copiedIndex.set(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }
}
