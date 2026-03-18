import Papa from 'papaparse';
import { DailyMetrics, ParsedData, CSVFileType } from './types';

// ─── YouTube Studio Export Formats ──────────────────────────────────────
//
// YouTube Studio exports vary depending on which tab the user is on:
//
// 1. "Content" tab export (3 files):
//    - Table data.csv: per-video summaries (Content, Video title, Views, Watch time (hours), Subscribers, ...)
//    - Totals.csv: daily channel-wide views (Date, Views)
//    - Chart data.csv: daily per-video views (Date, Content, Video title, ..., Views)
//
// 2. "Overview" / metric-specific tab exports:
//    - Subscribers: Date, Subscribers gained, Subscribers lost
//    - Watch time: Date, Watch time (hours)
//    - Views: Date, Views
//
// We handle ALL of these formats.

type RawRow = Record<string, string>;
type ExtendedCSVFileType = CSVFileType | 'content_table' | 'content_chart' | 'date_breakdown';

// ─── Detection ──────────────────────────────────────────────────────────

function detectFileType(headers: string[], rows: RawRow[]): ExtendedCSVFileType {
  const normalized = headers.map(h => h.toLowerCase().trim());

  // Content tab "Table data.csv" — has "content" (video ID) + "video title" columns, no date column
  const hasContent = normalized.includes('content');
  const hasVideoTitle = normalized.some(h => h.includes('video title'));
  const hasDate = normalized.some(h => h === 'date' || h === 'day');

  if (hasContent && hasVideoTitle && !hasDate) {
    // Per-video summary table — check if it has watch time and/or subscriber columns
    const hasWatchTime = normalized.some(h => h.includes('watch time'));
    const hasSubs = normalized.some(h => h.includes('subscriber'));
    if (hasWatchTime || hasSubs) return 'content_table';
    return 'unknown';
  }

  // Content tab "Chart data.csv" — has date + content + video title (daily per-video views)
  if (hasContent && hasVideoTitle && hasDate) {
    return 'content_chart';
  }

  // Simple daily CSVs (Overview tab exports or Totals.csv)
  if (hasDate) {
    const hasWatchTime = normalized.some(h => h.includes('watch time') || h.includes('watch hours'));
    const hasSubs = normalized.some(h => h === 'subscribers');
    const hasViews = normalized.some(h => h === 'views');

    // Date breakdown "Table data.csv" — has Date + Subscribers + Views + Watch time all in one
    if (hasWatchTime && hasSubs && hasViews) {
      return 'date_breakdown';
    }

    if (hasWatchTime) {
      return 'watchtime';
    }
    if (normalized.some(h => h.includes('subscribers gained') || h.includes('subscribers lost'))) {
      return 'subscribers';
    }
    if (hasSubs) {
      return 'subscribers';
    }
    if (hasViews) {
      return 'views';
    }
    // Only Date + one numeric column (like Totals.csv)
    if (headers.length === 2) {
      return 'views';
    }
  }

  return 'unknown';
}

// ─── Helpers ────────────────────────────────────────────────────────────

function parseNumber(val: string | number | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = val.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeDate(dateStr: string): string {
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const usFormat = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usFormat) {
    const [, m, d, y] = usFormat;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return trimmed;
}

function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xFEFF) return text.slice(1);
  return text;
}

function getColumnValue(row: RawRow, headers: string[], ...patterns: string[]): string {
  for (const pattern of patterns) {
    const key = headers.find(h => h.toLowerCase().trim().includes(pattern.toLowerCase()));
    if (key && row[key] !== undefined) return row[key];
  }
  return '';
}

// ─── Parsers for Each Format ────────────────────────────────────────────

// Totals.csv or Overview-tab Views export: Date, Views
function parseDailyViewsCSV(rows: RawRow[], headers: string[]): Map<string, Partial<DailyMetrics>> {
  const result = new Map<string, Partial<DailyMetrics>>();
  const dateKey = headers.find(h => h.toLowerCase().trim() === 'date' || h.toLowerCase().trim() === 'day') || headers[0];
  const viewsKey = headers.find(h => h.toLowerCase().trim() === 'views') || headers[1];

  for (const row of rows) {
    const rawDate = row[dateKey];
    if (!rawDate) continue;
    const date = normalizeDate(rawDate);
    if (date.length < 8) continue;

    result.set(date, {
      date,
      views: parseNumber(row[viewsKey]),
    });
  }
  return result;
}

// Overview-tab Subscribers export: Date, Subscribers gained, Subscribers lost
function parseDailySubscribersCSV(rows: RawRow[], headers: string[]): Map<string, Partial<DailyMetrics>> {
  const result = new Map<string, Partial<DailyMetrics>>();
  const dateKey = headers.find(h => h.toLowerCase().includes('date')) || headers[0];

  for (const row of rows) {
    const rawDate = row[dateKey];
    if (!rawDate) continue;
    const date = normalizeDate(rawDate);
    if (date.length < 8) continue;

    const gained = parseNumber(getColumnValue(row, headers, 'gained', 'new'));
    const lost = parseNumber(getColumnValue(row, headers, 'lost', 'unsubscribed'));

    result.set(date, {
      date,
      subscribersGained: gained,
      subscribersLost: lost,
    });
  }
  return result;
}

// Overview-tab Watch time export: Date, Watch time (hours)
function parseDailyWatchTimeCSV(rows: RawRow[], headers: string[]): Map<string, Partial<DailyMetrics>> {
  const result = new Map<string, Partial<DailyMetrics>>();
  const dateKey = headers.find(h => h.toLowerCase().includes('date')) || headers[0];

  for (const row of rows) {
    const rawDate = row[dateKey];
    if (!rawDate) continue;
    const date = normalizeDate(rawDate);
    if (date.length < 8) continue;

    const hours = parseNumber(getColumnValue(row, headers, 'watch time', 'watch hours', 'hours'));

    result.set(date, {
      date,
      watchTimeHours: hours,
    });
  }
  return result;
}

// Content tab "Table data.csv": per-video summary with totals row
// Returns aggregate totals extracted from the "Total" row
function parseContentTableCSV(rows: RawRow[], headers: string[]): {
  data: Map<string, Partial<DailyMetrics>>;
  aggregates: { totalWatchHours: number; totalSubscribers: number; totalViews: number };
} {
  let totalWatchHours = 0;
  let totalSubscribers = 0;
  let totalViews = 0;

  for (const row of rows) {
    const contentId = getColumnValue(row, headers, 'content');

    // The first row is "Total" — it has aggregate channel data
    if (contentId === 'Total' || contentId === '') {
      totalViews = parseNumber(getColumnValue(row, headers, 'views'));
      totalWatchHours = parseNumber(getColumnValue(row, headers, 'watch time'));
      totalSubscribers = parseNumber(getColumnValue(row, headers, 'subscribers'));
    }
  }

  return {
    data: new Map(),
    aggregates: { totalWatchHours, totalSubscribers, totalViews },
  };
}

// Content tab "Chart data.csv": daily per-video views — aggregate into daily totals
function parseContentChartCSV(rows: RawRow[], headers: string[]): Map<string, Partial<DailyMetrics>> {
  const dailyTotals = new Map<string, number>();
  const dateKey = headers.find(h => h.toLowerCase().includes('date')) || headers[0];

  for (const row of rows) {
    const rawDate = row[dateKey];
    if (!rawDate) continue;
    const date = normalizeDate(rawDate);
    if (date.length < 8) continue;

    const views = parseNumber(getColumnValue(row, headers, 'views'));
    dailyTotals.set(date, (dailyTotals.get(date) || 0) + views);
  }

  const result = new Map<string, Partial<DailyMetrics>>();
  for (const [date, views] of dailyTotals) {
    result.set(date, { date, views });
  }
  return result;
}

// Date breakdown "Table data.csv": daily rows with Subscribers, Views, Watch time all in one
function parseDateBreakdownCSV(rows: RawRow[], headers: string[]): {
  data: Map<string, Partial<DailyMetrics>>;
  aggregates?: { totalWatchHours: number; totalSubscribers: number; totalViews: number };
} {
  const result = new Map<string, Partial<DailyMetrics>>();
  const dateKey = headers.find(h => h.toLowerCase().includes('date')) || headers[0];
  let aggregates: { totalWatchHours: number; totalSubscribers: number; totalViews: number } | undefined;

  for (const row of rows) {
    const rawDate = row[dateKey];
    if (!rawDate) continue;

    // Skip the "Total" row but extract aggregates from it
    if (rawDate === 'Total') {
      aggregates = {
        totalSubscribers: parseNumber(getColumnValue(row, headers, 'subscribers')),
        totalViews: parseNumber(getColumnValue(row, headers, 'views')),
        totalWatchHours: parseNumber(getColumnValue(row, headers, 'watch time')),
      };
      continue;
    }

    const date = normalizeDate(rawDate);
    if (date.length < 8) continue;

    result.set(date, {
      date,
      subscribersGained: parseNumber(getColumnValue(row, headers, 'subscribers')),
      views: parseNumber(getColumnValue(row, headers, 'views')),
      watchTimeHours: parseNumber(getColumnValue(row, headers, 'watch time')),
    });
  }

  return { data: result, aggregates };
}

// ─── Main Parse Function ────────────────────────────────────────────────

type ParseResult = {
  type: ExtendedCSVFileType;
  data: Map<string, Partial<DailyMetrics>>;
  aggregates?: { totalWatchHours: number; totalSubscribers: number; totalViews: number };
};

export function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = stripBOM(e.target?.result as string || '');
        const parsed = Papa.parse<RawRow>(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
        });

        if (parsed.errors.length > 0 && parsed.data.length === 0) {
          reject(new Error(`Failed to parse CSV: ${parsed.errors[0]?.message}`));
          return;
        }

        const headers = parsed.meta.fields || [];
        const fileType = detectFileType(headers, parsed.data);

        switch (fileType) {
          case 'date_breakdown': {
            const { data: dbData, aggregates: dbAgg } = parseDateBreakdownCSV(parsed.data, headers);
            resolve({ type: fileType, data: dbData, aggregates: dbAgg });
            return;
          }
          case 'content_table': {
            const { data, aggregates } = parseContentTableCSV(parsed.data, headers);
            resolve({ type: fileType, data, aggregates });
            return;
          }
          case 'content_chart':
            resolve({ type: fileType, data: parseContentChartCSV(parsed.data, headers) });
            return;
          case 'subscribers':
            resolve({ type: fileType, data: parseDailySubscribersCSV(parsed.data, headers) });
            return;
          case 'watchtime':
            resolve({ type: fileType, data: parseDailyWatchTimeCSV(parsed.data, headers) });
            return;
          case 'views':
            resolve({ type: fileType, data: parseDailyViewsCSV(parsed.data, headers) });
            return;
          default:
            // Last resort — try as daily views
            resolve({ type: 'unknown', data: parseDailyViewsCSV(parsed.data, headers) });
            return;
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ─── Merge All CSVs ─────────────────────────────────────────────────────

export async function parseAllCSVs(files: File[]): Promise<ParsedData> {
  const results = await Promise.all(files.map(parseCSVFile));

  const merged = new Map<string, DailyMetrics>();
  const filesDetected: CSVFileType[] = [];
  let aggregates: { totalWatchHours: number; totalSubscribers: number; totalViews: number } | undefined;

  for (const result of results) {
    const simpleType: CSVFileType =
      result.type === 'content_table' || result.type === 'content_chart' || result.type === 'date_breakdown'
        ? 'views'
        : result.type;
    filesDetected.push(simpleType);

    if (result.aggregates) {
      aggregates = result.aggregates;
    }

    for (const [date, metrics] of result.data) {
      const existing = merged.get(date) || { date };
      merged.set(date, { ...existing, ...metrics });
    }
  }

  // Sort by date
  const daily = Array.from(merged.values()).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Build cumulative subscribers from gains/losses if available
  const hasGainedLost = daily.some(d => d.subscribersGained !== undefined);
  if (hasGainedLost) {
    let cumulative = 0;
    for (const day of daily) {
      const net = (day.subscribersGained || 0) - Math.abs(day.subscribersLost || 0);
      cumulative += net;
      day.subscribers = cumulative;
    }
  }

  // If we have aggregates from content table but no daily subscriber data,
  // we can still report the total
  const lastDay = daily[daily.length - 1];
  const firstDay = daily[0];

  const totalViews = daily.reduce((sum, d) => sum + (d.views || 0), 0);
  const totalWatchHours = daily.reduce((sum, d) => sum + (d.watchTimeHours || 0), 0);

  const totals = {
    currentSubscribers: lastDay?.subscribers || aggregates?.totalSubscribers || 0,
    totalWatchTimeHours: totalWatchHours > 0 ? totalWatchHours : (aggregates?.totalWatchHours || 0),
    totalViews: totalViews > 0 ? totalViews : (aggregates?.totalViews || 0),
  };

  return {
    daily,
    totals,
    dateRange: {
      start: firstDay?.date || '',
      end: lastDay?.date || '',
    },
    filesDetected,
  };
}
