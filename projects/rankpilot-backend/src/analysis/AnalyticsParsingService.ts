import { parse } from 'csv-parse/sync';
import { z } from 'zod';

const analyticsRowSchema = z.object({
  path: z.string().min(1),
  views: z.number().int().min(0),
  activeUsers: z.number().int().min(0),
  avgEngagementTime: z.number().min(0),
  eventCount: z.number().int().min(0),
  keyEvents: z.number().int().min(0),
  totalRevenue: z.number().min(0),
});

export type AnalyticsRow = z.infer<typeof analyticsRowSchema>;

export interface ParseResult {
  rows: AnalyticsRow[];
  rowCount: number;
  dateRange: string | null;
}

const GA4_COLUMN_MAP: Record<string, keyof AnalyticsRow> = {
  'page path and screen class': 'path',
  'page path': 'path',
  'views': 'views',
  'active users': 'activeUsers',
  'average engagement time': 'avgEngagementTime',
  'average engagement time per active user': 'avgEngagementTime',
  'event count': 'eventCount',
  'key events': 'keyEvents',
  'conversions': 'keyEvents',
  'total revenue': 'totalRevenue',
};

const NUMERIC_FIELDS = new Set<keyof AnalyticsRow>([
  'views',
  'activeUsers',
  'avgEngagementTime',
  'eventCount',
  'keyEvents',
  'totalRevenue',
]);

function parseEngagementTime(value: string): number {
  // GA4 formats as "Xm Ys" or just seconds
  const minMatch = /(\d+)m/.exec(value);
  const secMatch = /(\d+)s/.exec(value);
  let seconds = 0;
  if (minMatch) seconds += Number.parseInt(minMatch[1], 10) * 60;
  if (secMatch) seconds += Number.parseInt(secMatch[1], 10);
  if (!minMatch && !secMatch) {
    const num = Number.parseFloat(value);
    return Number.isNaN(num) ? 0 : num;
  }
  return seconds;
}

export class AnalyticsParsingService {
  parse(csvContent: string): ParseResult {
    const lines = csvContent.split('\n');

    // Extract date range from comment header lines (GA4 format: "# Date range: ...")
    let dateRange: string | null = null;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('#')) {
        const dateMatch = /date range[:\s]+(.+)/i.exec(line);
        if (dateMatch) {
          dateRange = dateMatch[1].trim();
        }
        continue;
      }
      dataLines.push(line);
    }

    const csvData = dataLines.join('\n').trim();
    if (!csvData) {
      throw new Error('CSV file is empty or contains only comments');
    }

    const records: string[][] = parse(csvData, {
      skip_empty_lines: true,
      relax_column_count: true,
    });

    if (records.length < 2) {
      throw new Error('CSV file must contain a header row and at least one data row');
    }

    const [headerRow, ...dataRows] = records;
    const headers = headerRow.map(h => h.trim().toLowerCase());

    // Map CSV headers to our schema fields
    const columnMapping: Array<{ index: number; field: keyof AnalyticsRow }> = [];
    for (let i = 0; i < headers.length; i++) {
      const mapped = GA4_COLUMN_MAP[headers[i]];
      if (mapped) {
        columnMapping.push({ index: i, field: mapped });
      }
    }

    const hasPath = columnMapping.some(m => m.field === 'path');
    const hasViews = columnMapping.some(m => m.field === 'views');
    if (!hasPath || !hasViews) {
      throw new Error(
        'CSV must contain at least "Page path and screen class" and "Views" columns. ' +
        `Found columns: ${headers.join(', ')}`,
      );
    }

    const rows: AnalyticsRow[] = [];

    for (const row of dataRows) {
      const obj: Record<string, string | number> = {};

      for (const { index, field } of columnMapping) {
        const raw = (row[index] ?? '').trim();
        if (field === 'path') {
          obj[field] = raw;
        } else if (field === 'avgEngagementTime') {
          obj[field] = parseEngagementTime(raw);
        } else if (NUMERIC_FIELDS.has(field)) {
          const cleaned = raw.replaceAll(',', '').replaceAll('$', '');
          obj[field] = Number.parseFloat(cleaned) || 0;
        }
      }

      // Fill missing optional fields with 0
      const complete: Record<string, string | number> = {
        path: obj['path'] ?? '',
        views: obj['views'] ?? 0,
        activeUsers: obj['activeUsers'] ?? 0,
        avgEngagementTime: obj['avgEngagementTime'] ?? 0,
        eventCount: obj['eventCount'] ?? 0,
        keyEvents: obj['keyEvents'] ?? 0,
        totalRevenue: obj['totalRevenue'] ?? 0,
      };

      const parsed = analyticsRowSchema.safeParse(complete);
      if (parsed.success) {
        rows.push(parsed.data);
      }
    }

    if (rows.length === 0) {
      throw new Error('No valid data rows found in CSV');
    }

    return { rows, rowCount: rows.length, dateRange };
  }
}
