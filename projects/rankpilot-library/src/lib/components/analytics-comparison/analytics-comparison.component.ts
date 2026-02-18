import { Component, ChangeDetectionStrategy, input, signal, computed, inject, OnInit } from '@angular/core';
import { RankPilotApiService } from '../../services/rankpilot-api.service';
import type { AnalyticsSnapshot, AnalyticsComparison, AnalyticsComparisonRow } from '../../models/site.model';

@Component({
  selector: 'rp-analytics-comparison',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'style': 'display: block' },
  template: `
    @if (isExpanded()) {
      <section class="analytics-section">
        <button class="section-header" (click)="isExpanded.set(false)" aria-expanded="true">
          <h3>GA4 Analytics Comparison</h3>
          <span class="chevron">&#9650;</span>
        </button>

        <div class="section-body">
          <div class="upload-row">
            <div class="upload-card">
              <div class="upload-label">Before</div>
              @if (beforeSnapshot()) {
                <div class="snapshot-info">
                  <span class="snapshot-badge before">BEFORE</span>
                  <span>{{ beforeSnapshot()!.rowCount }} pages</span>
                  @if (beforeSnapshot()!.dateRange) {
                    <span class="date-range">{{ beforeSnapshot()!.dateRange }}</span>
                  }
                  <button class="btn-delete" (click)="deleteSnapshot(beforeSnapshot()!)" aria-label="Remove before snapshot">&times;</button>
                </div>
              } @else {
                <label class="upload-drop" for="before-upload">
                  <span>Upload CSV</span>
                  <input id="before-upload" type="file" accept=".csv" (change)="onFileSelected($event, 'BEFORE')" />
                </label>
              }
            </div>

            <div class="upload-card">
              <div class="upload-label">After</div>
              @if (afterSnapshot()) {
                <div class="snapshot-info">
                  <span class="snapshot-badge after">AFTER</span>
                  <span>{{ afterSnapshot()!.rowCount }} pages</span>
                  @if (afterSnapshot()!.dateRange) {
                    <span class="date-range">{{ afterSnapshot()!.dateRange }}</span>
                  }
                  <button class="btn-delete" (click)="deleteSnapshot(afterSnapshot()!)" aria-label="Remove after snapshot">&times;</button>
                </div>
              } @else {
                <label class="upload-drop" for="after-upload">
                  <span>Upload CSV</span>
                  <input id="after-upload" type="file" accept=".csv" (change)="onFileSelected($event, 'AFTER')" />
                </label>
              }
            </div>
          </div>

          @if (uploading()) {
            <p class="status-msg">Uploading...</p>
          }

          @if (uploadError()) {
            <p class="error-msg" role="alert">{{ uploadError() }}</p>
          }

          @if (comparison()) {
            <div class="comparison-table-wrap">
              <table class="comparison-table">
                <thead>
                  <tr>
                    <th>Page Path</th>
                    <th class="num">Before Views</th>
                    <th class="num">After Views</th>
                    <th class="num">Change</th>
                    <th class="num">Before Users</th>
                    <th class="num">After Users</th>
                    <th class="num">Change</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of comparison()!.rows; track row.path) {
                    <tr>
                      <td class="path-cell" [title]="row.path">{{ row.path }}</td>
                      <td class="num">{{ row.beforeViews }}</td>
                      <td class="num">{{ row.afterViews }}</td>
                      <td class="num" [class.positive]="row.viewsChange > 0" [class.negative]="row.viewsChange < 0">
                        @if (row.viewsChange > 0) { +{{ row.viewsChange }} }
                        @else { {{ row.viewsChange }} }
                        <span class="pct">({{ row.viewsChangePct }}%)</span>
                      </td>
                      <td class="num">{{ row.beforeUsers }}</td>
                      <td class="num">{{ row.afterUsers }}</td>
                      <td class="num" [class.positive]="row.usersChange > 0" [class.negative]="row.usersChange < 0">
                        @if (row.usersChange > 0) { +{{ row.usersChange }} }
                        @else { {{ row.usersChange }} }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </section>
    } @else {
      <button class="section-header collapsed" (click)="expand()" aria-expanded="false">
        <h3>GA4 Analytics Comparison</h3>
        @if (snapshotCount() > 0) {
          <span class="snapshot-count">{{ snapshotCount() }} snapshot{{ snapshotCount() === 1 ? '' : 's' }}</span>
        }
        <span class="chevron">&#9660;</span>
      </button>
    }
  `,
  styles: `
    :host { display: block; margin-top: 24px; }
    .section-header { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; font: inherit; text-align: left; }
    .section-header h3 { margin: 0; font-size: 16px; flex: 1; }
    .section-header.collapsed { border-radius: 8px; }
    .section-header:not(.collapsed) { border-radius: 8px 8px 0 0; border-bottom: none; }
    .chevron { font-size: 12px; color: #6b7280; }
    .snapshot-count { font-size: 13px; color: #6b7280; font-weight: 400; }
    .section-body { border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 16px; }
    .upload-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .upload-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .upload-label { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
    .upload-drop { display: flex; align-items: center; justify-content: center; padding: 16px; border: 2px dashed #d1d5db; border-radius: 6px; cursor: pointer; color: #6b7280; font-size: 14px; transition: border-color 0.15s; }
    .upload-drop:hover { border-color: #2563eb; color: #2563eb; }
    .upload-drop input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
    .snapshot-info { display: flex; align-items: center; gap: 8px; font-size: 13px; flex-wrap: wrap; }
    .snapshot-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .snapshot-badge.before { background: #dbeafe; color: #1e40af; }
    .snapshot-badge.after { background: #dcfce7; color: #166534; }
    .date-range { color: #6b7280; }
    .btn-delete { background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 18px; line-height: 1; padding: 0 4px; }
    .btn-delete:hover { color: #ef4444; }
    .status-msg { color: #6b7280; font-size: 14px; }
    .error-msg { color: #991b1b; background: #fee2e2; padding: 8px 12px; border-radius: 6px; font-size: 14px; }
    .comparison-table-wrap { overflow-x: auto; }
    .comparison-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .comparison-table th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151; white-space: nowrap; }
    .comparison-table td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
    .comparison-table th.num, .comparison-table td.num { text-align: right; }
    .path-cell { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 12px; }
    .positive { color: #16a34a; font-weight: 600; }
    .negative { color: #dc2626; font-weight: 600; }
    .pct { font-size: 11px; font-weight: 400; color: #6b7280; margin-left: 2px; }
    @media (max-width: 768px) {
      .upload-row { grid-template-columns: 1fr; }
    }
  `,
})
export class AnalyticsComparisonComponent implements OnInit {
  readonly siteId = input.required<string>();

  private readonly api = inject(RankPilotApiService);

  readonly snapshots = signal<AnalyticsSnapshot[]>([]);
  readonly comparison = signal<AnalyticsComparison | null>(null);
  readonly isExpanded = signal(false);
  readonly uploading = signal(false);
  readonly uploadError = signal('');

  readonly beforeSnapshot = computed(() =>
    this.snapshots().find(s => s.label === 'BEFORE') ?? null,
  );

  readonly afterSnapshot = computed(() =>
    this.snapshots().find(s => s.label === 'AFTER') ?? null,
  );

  readonly snapshotCount = computed(() => this.snapshots().length);

  async ngOnInit(): Promise<void> {
    await this.loadSnapshots();
  }

  expand(): void {
    this.isExpanded.set(true);
    if (this.beforeSnapshot() && this.afterSnapshot() && !this.comparison()) {
      this.loadComparison();
    }
  }

  async onFileSelected(event: Event, label: 'BEFORE' | 'AFTER'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (!file) return;

    this.uploading.set(true);
    this.uploadError.set('');

    try {
      await this.api.uploadAnalytics(this.siteId(), file, label);
      await this.loadSnapshots();

      if (this.beforeSnapshot() && this.afterSnapshot()) {
        await this.loadComparison();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Upload failed';
      this.uploadError.set(msg);
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async deleteSnapshot(snapshot: AnalyticsSnapshot): Promise<void> {
    try {
      await this.api.deleteAnalyticsSnapshot(this.siteId(), snapshot.id);
      this.comparison.set(null);
      await this.loadSnapshots();
    } catch {
      this.uploadError.set('Failed to delete snapshot');
    }
  }

  private async loadSnapshots(): Promise<void> {
    try {
      const snapshots = await this.api.getAnalyticsSnapshots(this.siteId());
      this.snapshots.set(snapshots);
    } catch {
      // Silently fail — section just won't show data
    }
  }

  private async loadComparison(): Promise<void> {
    try {
      const comparison = await this.api.getAnalyticsComparison(this.siteId());
      this.comparison.set(comparison);
    } catch {
      this.uploadError.set('Failed to load comparison');
    }
  }
}
