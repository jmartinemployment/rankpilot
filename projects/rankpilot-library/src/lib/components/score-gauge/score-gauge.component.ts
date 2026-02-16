import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

@Component({
  selector: 'rp-score-gauge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
  template: `
    <div class="gauge-container">
      <svg viewBox="0 0 120 120" class="gauge-svg">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" stroke-width="8" />
        <circle
          cx="60" cy="60" r="52"
          fill="none"
          [attr.stroke]="color()"
          stroke-width="8"
          stroke-linecap="round"
          [attr.stroke-dasharray]="dashArray()"
          stroke-dashoffset="0"
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="55" text-anchor="middle" [attr.fill]="color()" class="score-text">
          {{ score() }}
        </text>
        <text x="60" y="72" text-anchor="middle" fill="#6b7280" class="label-text">
          {{ label() }}
        </text>
      </svg>
    </div>
  `,
  styles: `
    :host { display: block; }
    .gauge-container { display: inline-block; width: 100%; max-width: 150px; }
    .gauge-svg { width: 100%; height: auto; }
    .score-text { font-size: 28px; font-weight: 700; }
    .label-text { font-size: 11px; }
  `,
})
export class ScoreGaugeComponent {
  readonly score = input(0);
  readonly label = input('Score');

  readonly color = computed(() => {
    const s = this.score();
    if (s >= 80) return '#22c55e';
    if (s >= 50) return '#f59e0b';
    return '#ef4444';
  });

  readonly dashArray = computed(() => {
    const circumference = 2 * Math.PI * 52;
    const filled = (this.score() / 100) * circumference;
    return `${filled} ${circumference - filled}`;
  });
}
