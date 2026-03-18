'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ProjectionPoint } from '@/lib/types';

type TimelineChartProps = {
  data: ProjectionPoint[];
  lastHistoricalDate: string;
};

type MetricView = 'subscribers' | 'watchtime';

export default function TimelineChart({ data, lastHistoricalDate }: TimelineChartProps) {
  const [view, setView] = useState<MetricView>('subscribers');

  const goal = view === 'subscribers' ? 1000 : 4000;
  const goalLabel = view === 'subscribers' ? '1,000 Subscribers' : '4,000 Watch Hours';
  const dataKey = view === 'subscribers' ? 'subscribers' : 'watchTimeHours';

  // Format dates for display
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatValue = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return Math.round(val).toString();
  };

  // Find index where projections start
  const projectionStartIndex = data.findIndex(d => d.date > lastHistoricalDate);

  return (
    <div className="w-full rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-6 shadow-[var(--card-shadow)]">
      {/* Header + Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-lg">
          Growth Timeline
        </h3>
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

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          />

          {/* Projection lines */}
          <Area
            type="monotone"
            dataKey={view === 'subscribers' ? 'conservative_subs' : 'conservative_hours'}
            stroke="var(--gray-400)"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            name={view === 'subscribers' ? 'conservative_subs' : 'conservative_hours'}
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
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Projection legend */}
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
    </div>
  );
}
