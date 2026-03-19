'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { ProjectionPoint, DailyMetrics } from '@/lib/types';

type WeeksToGoalPoint = {
  date: string;
  weeksToSubGoal: number | null;
  weeksToHoursGoal: number | null;
};

type ChartDataPoint = ProjectionPoint & { timestamp: number };

type TimelineChartProps = {
  data: ProjectionPoint[];
  daily: DailyMetrics[];
  lastHistoricalDate: string;
  currentSubscribers: number;
};

type MetricView = 'subscribers' | 'watchtime' | 'weekstogoal';
type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All';

const TIME_RANGES: { key: TimeRange; label: string; days: number | null }[] = [
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'All', label: 'All', days: null },
];

export default function TimelineChart({ data, daily, lastHistoricalDate, currentSubscribers }: TimelineChartProps) {
  const [view, setView] = useState<MetricView>('subscribers');
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  const goal = view === 'subscribers' ? 1000 : 4000;
  const goalLabel = view === 'subscribers' ? '1,000 Subscribers' : '4,000 Watch Hours';
  const dataKey = view === 'subscribers' ? 'subscribers' : 'watchTimeHours';

  // Filter data by selected time range and add timestamps for proper time-based x-axis
  const filteredData = useMemo((): ChartDataPoint[] => {
    const rangeDef = TIME_RANGES.find(r => r.key === timeRange);

    let result: ProjectionPoint[];
    if (!rangeDef || rangeDef.days === null) {
      result = data;
    } else {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - rangeDef.days);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      const historicalInRange = data.filter(
        d => d.date >= cutoffStr && d.date <= lastHistoricalDate
      );

      if (timeRange === '1Y') {
        const projectionData = data.filter(d => d.date > lastHistoricalDate);
        result = [...historicalInRange, ...projectionData];
      } else {
        result = historicalInRange;
      }
    }

    // Thin out dense historical data for smoother chart rendering
    // For ranges > 6 months, sample every 3rd day for historical data
    const thinned: ProjectionPoint[] = [];
    for (let i = 0; i < result.length; i++) {
      const isProjection = result[i].date > lastHistoricalDate;
      const isLast = i === result.length - 1;
      const isLastHistorical = result[i].date === lastHistoricalDate;

      if (isProjection || isLastHistorical || isLast) {
        thinned.push(result[i]);
      } else if (timeRange === 'All' || timeRange === '1Y') {
        // For longer ranges, sample every 3rd day
        if (i % 3 === 0) thinned.push(result[i]);
      } else if (timeRange === '6M') {
        if (i % 2 === 0) thinned.push(result[i]);
      } else {
        thinned.push(result[i]);
      }
    }

    // Add timestamps for time-based x-axis
    return thinned.map(d => ({
      ...d,
      timestamp: new Date(d.date).getTime(),
    }));
  }, [data, timeRange, lastHistoricalDate]);

  // Check if already monetization-eligible
  const lastDaySubs = daily.length > 0 ? (daily[daily.length - 1].subscribers ?? currentSubscribers) : currentSubscribers;
  const last365WatchHours = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return daily
      .filter(d => d.date >= cutoffStr)
      .reduce((sum, d) => sum + (d.watchTimeHours || 0), 0);
  }, [daily]);
  const alreadyEligible = lastDaySubs >= 1000 && last365WatchHours >= 4000;

  // Compute "Weeks to Goal" data from daily metrics, aggregated weekly
  const weeksToGoalData = useMemo((): WeeksToGoalPoint[] => {
    if (daily.length < 7) return [];

    const points: WeeksToGoalPoint[] = [];
    // Aggregate daily data into weekly buckets
    const weekSize = 7;
    const numWeeks = Math.floor(daily.length / weekSize);

    for (let w = 0; w < numWeeks; w++) {
      const weekEnd = (w + 1) * weekSize - 1;
      const weekDate = daily[weekEnd].date;
      const currentSubs = daily[weekEnd].subscribers ?? 0;

      // Cumulative watch hours for the last 365 days up to this point
      const dayIndex = weekEnd;
      const lookbackStart = Math.max(0, dayIndex - 364);
      let cumWatchHours = 0;
      for (let d = lookbackStart; d <= dayIndex; d++) {
        cumWatchHours += daily[d].watchTimeHours || 0;
      }

      // Rolling 4-week average for subscriber gain
      const lookbackWeeks = Math.min(4, w + 1);
      let totalSubGain = 0;
      let totalHoursGain = 0;
      for (let lw = 0; lw < lookbackWeeks; lw++) {
        const prevWeekEnd = (w - lw) * weekSize - 1;
        const curWeekEnd = (w - lw + 1) * weekSize - 1;
        if (prevWeekEnd < 0) {
          // First week: use the full week's gain
          const startSubs = daily[0].subscribers ?? 0;
          totalSubGain += (daily[curWeekEnd].subscribers ?? 0) - startSubs;
          // Watch hours for that week
          for (let d = 0; d <= curWeekEnd; d++) {
            totalHoursGain += daily[d].watchTimeHours || 0;
          }
        } else {
          totalSubGain += (daily[curWeekEnd].subscribers ?? 0) - (daily[prevWeekEnd].subscribers ?? 0);
          for (let d = prevWeekEnd + 1; d <= curWeekEnd; d++) {
            totalHoursGain += daily[d].watchTimeHours || 0;
          }
        }
      }
      const avgWeeklySubGain = totalSubGain / lookbackWeeks;
      const avgWeeklyHoursGain = totalHoursGain / lookbackWeeks;

      const remainingSubs = Math.max(0, 1000 - currentSubs);
      const remainingHours = Math.max(0, 4000 - cumWatchHours);

      const weeksToSubGoal = remainingSubs === 0
        ? 0
        : avgWeeklySubGain > 0
          ? Math.min(500, remainingSubs / avgWeeklySubGain)
          : 500;

      const weeksToHoursGoal = remainingHours === 0
        ? 0
        : avgWeeklyHoursGain > 0
          ? Math.min(500, remainingHours / avgWeeklyHoursGain)
          : 500;

      points.push({
        date: weekDate,
        weeksToSubGoal,
        weeksToHoursGoal,
      });
    }

    return points;
  }, [daily]);

  // Filter weeks-to-goal data by time range
  const filteredWeeksData = useMemo(() => {
    const rangeDef = TIME_RANGES.find(r => r.key === timeRange);
    if (!rangeDef || rangeDef.days === null) return weeksToGoalData;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - rangeDef.days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    return weeksToGoalData.filter(d => d.date >= cutoffStr);
  }, [weeksToGoalData, timeRange]);

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
    <div className="w-full rounded-[var(--card-radius)] border border-white/6 bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
      {/* Header + Toggle + Time Range */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-heading-gradient font-[family-name:var(--font-display)] font-medium text-xl">
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
            <button
              onClick={() => setView('weekstogoal')}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200
                ${view === 'weekstogoal'
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--foreground)]'
                }
              `}
            >
              Weeks to Goal
            </button>
          </div>
        </div>
      </div>

      {view === 'weekstogoal' ? (
        alreadyEligible ? (
          <div className="flex items-center justify-center h-[350px]">
            <div className="text-center">
              <p className="text-3xl mb-2">&#127881;</p>
              <p className="text-xl font-bold font-[family-name:var(--font-display)] text-[#2E7D32]">
                You&apos;ve already reached both goals!
              </p>
              <p className="text-sm text-[var(--gray-600)] mt-2">
                1,000+ subscribers and 4,000+ watch hours achieved.
              </p>
            </div>
          </div>
        ) : filteredWeeksData.length === 0 ? (
          <div className="flex items-center justify-center h-[350px]">
            <p className="text-sm text-[var(--gray-500)]">Not enough data to calculate weeks to goal.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={filteredWeeksData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: 'var(--gray-600)' }}
                  interval="preserveStartEnd"
                  minTickGap={60}
                />
                <YAxis
                  tickFormatter={(val) => Math.round(val).toString()}
                  tick={{ fontSize: 11, fill: 'var(--gray-600)' }}
                  width={50}
                  label={{ value: 'Weeks remaining', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--gray-500)' }}
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
                      weeksToSubGoal: 'Weeks to 1K Subs',
                      weeksToHoursGoal: 'Weeks to 4K Hours',
                    };
                    const numVal = typeof value === 'number' ? value : Number(value) || 0;
                    const nameStr = String(name);
                    return [Math.round(numVal).toLocaleString(), labels[nameStr] || nameStr];
                  }}
                />
                <ReferenceLine y={0} stroke="var(--gray-400)" strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="weeksToSubGoal"
                  stroke="var(--gold)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: 'var(--gold)' }}
                  name="weeksToSubGoal"
                  animationDuration={500}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="weeksToHoursGoal"
                  stroke="#1565C0"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#1565C0' }}
                  name="weeksToHoursGoal"
                  animationDuration={500}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4 text-xs text-[var(--gray-600)]">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2" style={{ borderColor: 'var(--gold)' }} />
                Weeks to 1,000 Subscribers
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-[#1565C0]" />
                Weeks to 4,000 Watch Hours
              </span>
            </div>
          </>
        )
      ) : (
        <>
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
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) => formatDate(new Date(ts).toISOString().split('T')[0])}
                tick={{ fontSize: 11, fill: 'var(--gray-600)' }}
                minTickGap={60}
              />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: 11, fill: 'var(--gray-600)' }}
                width={50}
                domain={[0, (dataMax: number) => {
                  // Ensure the goal line stays at a stable position
                  // Y-axis max is at least 130% of the goal, or the data max, whichever is larger
                  const minMax = goal * 1.3;
                  return Math.max(minMax, dataMax * 1.1);
                }]}
              />
              <Tooltip
                labelFormatter={(ts) => new Date(ts).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    subscribers: 'Subscribers',
                    watchTimeHours: 'Watch Hours',
                    current_subs: 'Current Pace',
                    current_hours: 'Current Pace',
                    whatif_subs: 'What-If (adjust below)',
                    whatif_hours: 'What-If (adjust below)',
                  };
                  const numVal = typeof value === 'number' ? value : Number(value) || 0;
                  const nameStr = String(name);
                  if (nameStr === 'timestamp') return null;
                  return [Math.round(numVal).toLocaleString(), labels[nameStr] || nameStr];
                }}
              />

              {/* Goal line */}
              <ReferenceLine
                y={goal}
                stroke="var(--gold)"
                strokeDasharray="8 4"
                strokeWidth={2.5}
                label={{
                  value: `🎯 ${goalLabel}`,
                  position: 'insideTopRight',
                  fontSize: 12,
                  fill: 'var(--gold)',
                  fontWeight: 600,
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
                    dataKey={view === 'subscribers' ? 'current_subs' : 'current_hours'}
                    stroke={view === 'subscribers' ? 'var(--gold)' : '#1565C0'}
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    name={view === 'subscribers' ? 'current_subs' : 'current_hours'}
                    animationDuration={500}
                  />
                  {/* What-If scenario line */}
                  {filteredData.some(d => d[view === 'subscribers' ? 'whatif_subs' : 'whatif_hours'] !== undefined) && (
                    <Area
                      type="monotone"
                      dataKey={view === 'subscribers' ? 'whatif_subs' : 'whatif_hours'}
                      stroke="#E040FB"
                      fill="none"
                      strokeWidth={2.5}
                      strokeDasharray="4 2"
                      dot={false}
                      name={view === 'subscribers' ? 'whatif_subs' : 'whatif_hours'}
                      animationDuration={300}
                    />
                  )}
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>

          {/* Projection legend (only when projections are visible) */}
          {showProjections && (
            <div className="flex justify-center gap-6 mt-4 text-xs text-[var(--gray-600)]">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: view === 'subscribers' ? 'var(--gold)' : '#1565C0' }} />
                Current Pace
              </span>
              {filteredData.some(d => d.whatif_subs !== undefined || d.whatif_hours !== undefined) && (
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0 border-t-2 border-dashed border-[#E040FB]" />
                  What-If
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
