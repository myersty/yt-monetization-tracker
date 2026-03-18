'use client';

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyMetrics } from '@/lib/types';

type MetricTab = 'subscribers' | 'watchtime' | 'views';

type VelocityCardProps = {
  daily: DailyMetrics[];
  availableMetrics: MetricTab[];
};

const TAB_CONFIG: Record<MetricTab, { label: string; shortLabel: string }> = {
  subscribers: { label: 'Subs / Day', shortLabel: 'Subs' },
  watchtime: { label: 'Hours / Day', shortLabel: 'Hours' },
  views: { label: 'Views / Day', shortLabel: 'Views' },
};

function getMetricData(daily: DailyMetrics[], metric: MetricTab) {
  const recentDays = daily.slice(-30);

  const data = recentDays.map(d => {
    let value = 0;
    if (metric === 'subscribers') {
      value = (d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0);
    } else if (metric === 'watchtime') {
      value = d.watchTimeHours || 0;
    } else {
      value = d.views || 0;
    }
    return { date: d.date, value };
  });

  const firstHalf = data.slice(0, 15);
  const secondHalf = data.slice(15);
  const firstAvg = firstHalf.reduce((s, d) => s + d.value, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((s, d) => s + d.value, 0) / (secondHalf.length || 1);
  const isAccelerating = secondAvg > firstAvg * 1.05;
  const isDecelerating = secondAvg < firstAvg * 0.95;

  const currentAvg = data.reduce((s, d) => s + d.value, 0) / (data.length || 1);
  const trendColor = isAccelerating ? '#2E7D32' : isDecelerating ? '#c0392b' : '#888888';
  const trendLabel = isAccelerating ? 'Accelerating' : isDecelerating ? 'Decelerating' : 'Steady';

  return { data, currentAvg, trendColor, trendLabel, isAccelerating, isDecelerating };
}

export default function VelocityCard({ daily, availableMetrics }: VelocityCardProps) {
  const [activeTab, setActiveTab] = useState<MetricTab>(availableMetrics[0]);

  const metricData = useMemo(() => getMetricData(daily, activeTab), [daily, activeTab]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="rounded-[var(--card-radius)] border border-white/6 bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-[var(--gray-100)] rounded-full p-0.5">
          {availableMetrics.map(metric => (
            <button
              key={metric}
              onClick={() => setActiveTab(metric)}
              className={`
                px-3 py-1 text-xs font-medium rounded-full transition-all duration-200
                ${activeTab === metric
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--foreground)]'
                }
              `}
            >
              {TAB_CONFIG[metric].shortLabel}
            </button>
          ))}
        </div>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            color: metricData.trendColor,
            backgroundColor: metricData.isAccelerating
              ? 'rgba(46, 125, 50, 0.1)'
              : metricData.isDecelerating
                ? 'rgba(192, 57, 43, 0.1)'
                : 'rgba(136, 136, 136, 0.1)',
          }}
        >
          {metricData.trendLabel}
        </span>
      </div>

      {/* Big number */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-1">
          {TAB_CONFIG[activeTab].label}
        </p>
        <p className="font-[family-name:var(--font-display)] font-bold text-2xl">
          {metricData.currentAvg < 1 ? metricData.currentAvg.toFixed(2) : Math.round(metricData.currentAvg).toLocaleString()}
          <span className="text-[var(--gray-500)] text-sm font-normal ml-1">avg</span>
        </p>
      </div>

      {/* Sparkline */}
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metricData.data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="sparkGradVelocity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metricData.trendColor} stopOpacity={0.5} />
                <stop offset="100%" stopColor={metricData.trendColor} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--background)',
                border: '1px solid var(--gray-200)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(label) => formatDate(String(label))}
              formatter={(value) => [
                Math.round(Number(value)).toLocaleString(),
                TAB_CONFIG[activeTab].label.replace(' / Day', ''),
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={metricData.trendColor}
              fill="url(#sparkGradVelocity)"
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 30-day label */}
      <p className="text-[10px] text-[var(--gray-500)] mt-2 text-center">Last 30 days</p>
    </div>
  );
}

// Keep backward-compatible export for single sparkline usage
export function VelocitySparkline({ daily, metric, label, unit }: {
  daily: DailyMetrics[];
  metric: 'subscribers' | 'watchtime' | 'views';
  label: string;
  unit: string;
}) {
  return <VelocityCard daily={daily} availableMetrics={[metric]} />;
}
