'use client';

import { useState, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyMetrics } from '@/lib/types';
import { useCountUp } from '@/lib/useCountUp';

type MetricTab = 'subscribers' | 'watchtime' | 'views';

type VelocityCardProps = {
  daily: DailyMetrics[];
  availableMetrics: MetricTab[];
};

const TAB_CONFIG: Record<MetricTab, { label: string; shortLabel: string; unit: string }> = {
  subscribers: { label: 'Subscribers', shortLabel: 'Subs', unit: 'subs' },
  watchtime: { label: 'Watch Hours', shortLabel: 'Hours', unit: 'hrs' },
  views: { label: 'Views', shortLabel: 'Views', unit: 'views' },
};

function getMetricData(daily: DailyMetrics[], metric: MetricTab) {
  const recentDays = daily.slice(-90);

  // Build cumulative data with daily change for tooltip
  let cumulative = 0;
  const data = recentDays.map((d, i) => {
    let dailyValue = 0;
    if (metric === 'subscribers') {
      dailyValue = (d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0);
    } else if (metric === 'watchtime') {
      dailyValue = d.watchTimeHours || 0;
    } else {
      dailyValue = d.views || 0;
    }
    cumulative += dailyValue;

    // 7-day rolling average
    const windowStart = Math.max(0, i - 6);
    const window = recentDays.slice(windowStart, i + 1);
    let windowSum = 0;
    for (const w of window) {
      if (metric === 'subscribers') windowSum += (w.subscribersGained || 0) - Math.abs(w.subscribersLost || 0);
      else if (metric === 'watchtime') windowSum += w.watchTimeHours || 0;
      else windowSum += w.views || 0;
    }
    const rollingAvg = windowSum / window.length;

    return {
      date: d.date,
      cumulative: Math.round(cumulative * 100) / 100,
      daily: Math.round(dailyValue * 100) / 100,
      rollingAvg: Math.round(rollingAvg * 100) / 100,
    };
  });

  // Trend detection based on cumulative slope
  const midpoint = Math.floor(data.length / 2);
  const firstHalfDaily = data.slice(0, midpoint);
  const secondHalfDaily = data.slice(midpoint);
  const firstAvg = firstHalfDaily.reduce((s, d) => s + d.daily, 0) / (firstHalfDaily.length || 1);
  const secondAvg = secondHalfDaily.reduce((s, d) => s + d.daily, 0) / (secondHalfDaily.length || 1);
  const isAccelerating = secondAvg > firstAvg * 1.05;
  const isDecelerating = secondAvg < firstAvg * 0.95;

  const dailyAvg = data.reduce((s, d) => s + d.daily, 0) / (data.length || 1);
  const totalGained = cumulative;
  const trendColor = isAccelerating ? '#2E7D32' : isDecelerating ? '#c0392b' : '#888888';
  const trendLabel = isAccelerating ? 'Accelerating' : isDecelerating ? 'Decelerating' : 'Steady';

  return { data, dailyAvg, totalGained, trendColor, trendLabel, isAccelerating, isDecelerating };
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  const config = TAB_CONFIG[metric as MetricTab];

  return (
    <div className="bg-[var(--background)] border border-[var(--gray-200)] rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-[var(--gray-600)] font-medium mb-1">{formatDateShort(String(label))}</p>
      <div className="space-y-0.5">
        <p className="text-[var(--foreground)] font-semibold">
          {Math.round(point.cumulative).toLocaleString()} <span className="text-[var(--gray-500)] font-normal">total {config.unit}</span>
        </p>
        <p className="text-[var(--gray-500)]">
          {point.daily >= 0 ? '+' : ''}{Math.round(point.daily).toLocaleString()} that day
        </p>
        <p className="text-[var(--gray-500)]">
          {Math.round(point.rollingAvg).toLocaleString()}/day <span className="text-[var(--gray-600)]">(7-day avg)</span>
        </p>
      </div>
    </div>
  );
}

export default function VelocityCard({ daily, availableMetrics }: VelocityCardProps) {
  const [activeTab, setActiveTab] = useState<MetricTab>(availableMetrics[0]);
  const [showTrendTip, setShowTrendTip] = useState(false);
  const tipTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const metricData = useMemo(() => getMetricData(daily, activeTab), [daily, activeTab]);
  const animatedTotal = useCountUp(Math.round(metricData.totalGained), 800, 200);

  return (
    <div className="card ring-base ring-bl p-5 min-h-[320px] flex flex-col">
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-[var(--gray-100)] rounded-full p-0.5">
          {availableMetrics.map(metric => (
            <button
              key={metric}
              onClick={() => setActiveTab(metric)}
              className={`
                px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 cursor-pointer active:scale-95
                ${activeTab === metric
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--foreground)] hover:scale-105'
                }
              `}
            >
              {TAB_CONFIG[metric].shortLabel}
            </button>
          ))}
        </div>
        <div className="relative">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full cursor-help"
            style={{
              color: metricData.trendColor,
              backgroundColor: metricData.isAccelerating
                ? 'rgba(46, 125, 50, 0.1)'
                : metricData.isDecelerating
                  ? 'rgba(192, 57, 43, 0.1)'
                  : 'rgba(136, 136, 136, 0.1)',
            }}
            onMouseEnter={() => {
              if (tipTimeout.current) clearTimeout(tipTimeout.current);
              setShowTrendTip(true);
            }}
            onMouseLeave={() => {
              tipTimeout.current = setTimeout(() => setShowTrendTip(false), 150);
            }}
          >
            {metricData.trendLabel}
          </span>
          {showTrendTip && (
            <div className="absolute right-0 top-full mt-2 w-56 p-3 rounded-xl bg-[var(--background)] border border-[var(--gray-200)] shadow-lg z-50 text-xs text-[var(--gray-600)] leading-relaxed">
              Compares your daily average in the first vs. second half of the last 90 days. {metricData.isAccelerating ? 'Your recent pace is >5% faster than the first half.' : metricData.isDecelerating ? 'Your recent pace is >5% slower than the first half.' : 'Your pace is roughly the same across both halves.'}
            </div>
          )}
        </div>
      </div>

      {/* Big number — total gained over 90 days */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-1">
          {TAB_CONFIG[activeTab].label} gained (90 days)
        </p>
        <div className="flex items-baseline gap-3">
          <p className="font-[family-name:var(--font-display)] font-bold text-3xl">
            +{animatedTotal.toLocaleString()}
          </p>
          <p className="text-[var(--gray-500)] text-sm">
            ~{metricData.dailyAvg < 1 ? metricData.dailyAvg.toFixed(1) : Math.round(metricData.dailyAvg).toLocaleString()}/day avg
          </p>
        </div>
      </div>

      {/* Cumulative sparkline */}
      <div style={{ position: 'relative', zIndex: 3, width: '100%', height: '160px' }}>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={metricData.data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`sparkGrad-${activeTab}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metricData.trendColor} stopOpacity={0.5} />
                <stop offset="100%" stopColor={metricData.trendColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <Tooltip
              content={<CustomTooltip metric={activeTab} />}
              cursor={{ stroke: 'var(--gray-400)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={metricData.trendColor}
              fill={`url(#sparkGrad-${activeTab})`}
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Period label */}
      <p className="text-[10px] text-[var(--gray-500)] mt-2 text-center">Last 90 days</p>
    </div>
  );
}
