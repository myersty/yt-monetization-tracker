'use client';

import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { DailyMetrics } from '@/lib/types';

type VelocitySparklineProps = {
  daily: DailyMetrics[];
  metric: 'subscribers' | 'watchtime' | 'views';
  label: string;
  unit: string;
};

export default function VelocitySparkline({ daily, metric, label, unit }: VelocitySparklineProps) {
  // Last 30 days
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

  // Calculate trend
  const firstHalf = data.slice(0, 15);
  const secondHalf = data.slice(15);
  const firstAvg = firstHalf.reduce((s, d) => s + d.value, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((s, d) => s + d.value, 0) / (secondHalf.length || 1);
  const isAccelerating = secondAvg > firstAvg * 1.05;
  const isDecelerating = secondAvg < firstAvg * 0.95;

  const currentAvg = data.reduce((s, d) => s + d.value, 0) / (data.length || 1);
  const trendColor = isAccelerating ? '#2E7D32' : isDecelerating ? '#c0392b' : 'var(--gray-500)';
  const trendLabel = isAccelerating ? 'Accelerating' : isDecelerating ? 'Decelerating' : 'Steady';

  return (
    <div className="rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-4 shadow-[var(--card-shadow)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)]">
          {label}
        </p>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            color: trendColor,
            backgroundColor: isAccelerating
              ? 'rgba(46, 125, 50, 0.1)'
              : isDecelerating
                ? 'rgba(192, 57, 43, 0.1)'
                : 'var(--gray-100)',
          }}
        >
          {trendLabel}
        </span>
      </div>

      <p className="font-[family-name:var(--font-display)] font-bold text-xl mb-2">
        {currentAvg < 1 ? currentAvg.toFixed(2) : Math.round(currentAvg).toLocaleString()}
        <span className="text-[var(--gray-500)] text-sm font-normal ml-1">{unit}</span>
      </p>

      <div className="h-16 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={`sparkGrad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={trendColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={trendColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={trendColor}
              fill={`url(#sparkGrad-${metric})`}
              strokeWidth={2}
              dot={false}
              baseValue="dataMin"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
