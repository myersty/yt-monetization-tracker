'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { ProjectionPoint } from '@/lib/types';

type TimelineChartProps = {
  data: ProjectionPoint[];
  lastHistoricalDate: string;
};

type MetricView = 'subscribers' | 'watchtime';
type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All';

const TIME_RANGES: { key: TimeRange; label: string; days: number | null }[] = [
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'All', label: 'All', days: null },
];

export default function TimelineChart({ data, lastHistoricalDate }: TimelineChartProps) {
  const [view, setView] = useState<MetricView>('subscribers');
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  const goal = view === 'subscribers' ? 1000 : 4000;
  const goalLabel = view === 'subscribers' ? '1,000 Subscribers' : '4,000 Watch Hours';
  const dataKey = view === 'subscribers' ? 'subscribers' : 'watchTimeHours';

  // Filter data by selected time range
  const filteredData = useMemo(() => {
    const rangeDef = TIME_RANGES.find(r => r.key === timeRange);
    if (!rangeDef || rangeDef.days === null) return data;

    // For time ranges, show historical data from that window + projections only for 1Y/All
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - rangeDef.days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Filter historical data to the window
    const historicalInRange = data.filter(
      d => d.date >= cutoffStr && d.date <= lastHistoricalDate
    );

    // Only show projections for 1Y and All
    if (timeRange === '1Y') {
      const projectionData = data.filter(d => d.date > lastHistoricalDate);
      return [...historicalInRange, ...projectionData];
    }

    return historicalInRange;
  }, [data, timeRange, lastHistoricalDate]);

  // Show projections only for 1Y and All
  const showProjections = timeRange === '1Y' || timeRange === 'All';

  // Format dates for display
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatValue = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return Math.round(val).toString();
  };

  return (
    <div className="w-full rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-6 shadow-[var(--card-shadow)]">
      {/* Header + Toggle + Time Range */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-lg">
          Growth Timeline
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {/* Time range pills */}
          <div className="flex bg-[var(--gray-100)] rounded-full p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key)}
                className={`
                  px-3 py-1 text-xs font-medium rounded-full transition-all duration-200
                  ${timeRange === range.key
                    ? 'bg-[var(--gold)] text-white'
                    : 'text-[var(--gray-600)] hover:text-[var(--foreground)]'
                  }
                `}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Metric toggle */}
          <div className="flex bg-[var(--gray-100)] rounded-full p-1">
            <button
              onClick={() => setView('subscribers')}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200
                ${view === 'subscribers'
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--foreground)]'
                }
              `}
            >
              Subscribers
            </button>
            <button
              onClick={() => setView('watchtime')}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200
                ${view === 'watchtime'
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--foreground)]'
                }
              `}
            >
              Watch Hours
            </button>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradientGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1565C0" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: 'var(--gray-600)' }}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            tickFormatter={formatValue}
            tick={{ fontSize: 11, fill: 'var(--gray-600)' }}
            width={50}
          />
          <Tooltip
            labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                subscribers: 'Subscribers',
                watchTimeHours: 'Watch Hours',
                conservative_subs: 'Conservative',
                conservative_hours: 'Conservative',
                current_subs: 'Current Pace',
                current_hours: 'Current Pace',
                optimistic_subs: 'Optimistic',
                optimistic_hours: 'Optimistic',
              };
              const numVal = typeof value === 'number' ? value : Number(value) || 0;
              const nameStr = String(name);
              return [Math.round(numVal).toLocaleString(), labels[nameStr] || nameStr];
            }}
          />

          {/* Goal line */}
          <ReferenceLine
            y={goal}
            stroke="var(--gold)"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: goalLabel,
              position: 'right',
              fontSize: 11,
              fill: 'var(--gold)',
            }}
          />

          {/* Historical data */}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={view === 'subscribers' ? 'var(--gold)' : '#1565C0'}
            fill={view === 'subscribers' ? 'url(#gradientGold)' : 'url(#gradientBlue)'}
            strokeWidth={2}
            dot={false}
            animationDuration={500}
          />

          {/* Projection lines (only for 1Y and All) */}
          {showProjections && (
            <>
              <Area
                type="monotone"
                dataKey={view === 'subscribers' ? 'conservative_subs' : 'conservative_hours'}
                stroke="var(--gray-400)"
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                name={view === 'subscribers' ? 'conservative_subs' : 'conservative_hours'}
                animationDuration={500}
              />
              <Area
                type="monotone"
                dataKey={view === 'subscribers' ? 'current_subs' : 'current_hours'}
                stroke={view === 'subscribers' ? 'var(--gold)' : '#1565C0'}
                fill="none"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name={view === 'subscribers' ? 'current_subs' : 'current_hours'}
                animationDuration={500}
              />
              <Area
                type="monotone"
                dataKey={view === 'subscribers' ? 'optimistic_subs' : 'optimistic_hours'}
                stroke="#2E7D32"
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                name={view === 'subscribers' ? 'optimistic_subs' : 'optimistic_hours'}
                animationDuration={500}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Projection legend (only when projections are visible) */}
      {showProjections && (
        <div className="flex justify-center gap-6 mt-4 text-xs text-[var(--gray-600)]">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0 border-t-2 border-dashed border-[var(--gray-400)]" />
            Conservative
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: view === 'subscribers' ? 'var(--gold)' : '#1565C0' }} />
            Current Pace
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0 border-t-2 border-dashed border-[#2E7D32]" />
            Optimistic
          </span>
        </div>
      )}
    </div>
  );
}
