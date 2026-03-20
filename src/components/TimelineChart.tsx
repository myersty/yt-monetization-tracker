'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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

type WhatIfRatesType = {
  dailyNewSubs: number;
  dailyWatchHours: number;
};

type TimelineChartProps = {
  data: ProjectionPoint[];
  daily: DailyMetrics[];
  lastHistoricalDate: string;
  currentSubscribers: number;
  totalWatchTimeHours?: number;
  whatIfRates?: WhatIfRatesType;
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

export default function TimelineChart({ data, daily, lastHistoricalDate, currentSubscribers, totalWatchTimeHours, whatIfRates }: TimelineChartProps) {
  const [view, setView] = useState<MetricView>('subscribers');
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  const goal = view === 'subscribers' ? 1000 : 4000;
  const goalLabel = view === 'subscribers' ? '1,000 Subscribers' : '4,000 Watch Hours';
  const dataKey = view === 'subscribers' ? 'subscribers' : 'watchTimeHours';
  const yAxisLabel = view === 'subscribers' ? 'Subscribers' : view === 'watchtime' ? 'Watch Hours' : 'Weeks to Goal';

  // Filter data by selected time range — zoom in/out around today
  // Each range creates a symmetric window: N days back + N days forward
  // "All" shows everything including full projection
  const filteredData = useMemo((): ChartDataPoint[] => {
    const rangeDef = TIME_RANGES.find(r => r.key === timeRange);

    let result: ProjectionPoint[];
    if (!rangeDef || rangeDef.days === null) {
      // "All" — show everything
      result = [...data];
    } else {
      // Anchor on lastHistoricalDate (stable between server/client to avoid hydration mismatch)
      const anchor = new Date(lastHistoricalDate + 'T00:00:00');
      // Look back by the range amount
      const pastCutoff = new Date(anchor);
      pastCutoff.setDate(pastCutoff.getDate() - rangeDef.days);
      const pastStr = pastCutoff.toISOString().split('T')[0];

      // Look forward by the same amount (zoom symmetry)
      const futureCutoff = new Date(anchor);
      futureCutoff.setDate(futureCutoff.getDate() + rangeDef.days);
      const futureStr = futureCutoff.toISOString().split('T')[0];

      result = data.filter(d => d.date >= pastStr && d.date <= futureStr);
    }

    // Thin out dense data for smoother chart rendering
    const thinned: ProjectionPoint[] = [];
    for (let i = 0; i < result.length; i++) {
      const isProjection = result[i].date > lastHistoricalDate;
      const isLast = i === result.length - 1;
      const isLastHistorical = result[i].date === lastHistoricalDate;

      if (isProjection || isLastHistorical || isLast) {
        thinned.push(result[i]);
      } else if (timeRange === 'All' || timeRange === '1Y') {
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

  // Project Weeks to Goal forward using What-If rates (or current pace)
  // This extends the historical data with projected points trending toward 0
  const weeksToGoalWithProjection = useMemo(() => {
    if (weeksToGoalData.length === 0) return weeksToGoalData;

    const lastPoint = weeksToGoalData[weeksToGoalData.length - 1];
    const lastDate = new Date(lastPoint.date + 'T00:00:00');
    const lastSubWeeks = lastPoint.weeksToSubGoal ?? 0;
    const lastHourWeeks = lastPoint.weeksToHoursGoal ?? 0;

    // If both are already 0, no projection needed
    if (lastSubWeeks <= 0 && lastHourWeeks <= 0) return weeksToGoalData;

    // Use what-if rates to project weekly progress
    const weeklySubGain = (whatIfRates?.dailyNewSubs ?? 0) * 7;
    const weeklyHourGain = (whatIfRates?.dailyWatchHours ?? 0) * 7;

    // Current state
    const lastDayData = daily[daily.length - 1];
    let projectedSubs = lastDayData?.subscribers ?? currentSubscribers;
    const cumWatchHours = totalWatchTimeHours ?? 0;
    let projectedHours = cumWatchHours;

    const projectionPoints: WeeksToGoalPoint[] = [];
    const maxProjectionWeeks = Math.max(lastSubWeeks, lastHourWeeks) + 5; // extend a bit past zero

    for (let w = 1; w <= Math.min(maxProjectionWeeks, 104); w++) { // cap at 2 years
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + w * 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      projectedSubs += weeklySubGain;
      projectedHours += weeklyHourGain;

      const remainingSubs = Math.max(0, 1000 - projectedSubs);
      const remainingHours = Math.max(0, 4000 - projectedHours);

      const weeksToSubGoal = remainingSubs === 0 ? 0
        : weeklySubGain > 0 ? remainingSubs / weeklySubGain : 500;
      const weeksToHoursGoal = remainingHours === 0 ? 0
        : weeklyHourGain > 0 ? remainingHours / weeklyHourGain : 500;

      projectionPoints.push({ date: dateStr, weeksToSubGoal, weeksToHoursGoal });

      // Stop once both hit zero
      if (weeksToSubGoal <= 0 && weeksToHoursGoal <= 0) break;
    }

    return [...weeksToGoalData, ...projectionPoints];
  }, [weeksToGoalData, whatIfRates, daily, currentSubscribers, totalWatchTimeHours]);

  // Filter weeks-to-goal data by time range
  const filteredWeeksData = useMemo(() => {
    const rangeDef = TIME_RANGES.find(r => r.key === timeRange);
    if (!rangeDef || rangeDef.days === null) return weeksToGoalWithProjection;

    const anchor = new Date(lastHistoricalDate + 'T00:00:00');
    const pastCutoff = new Date(anchor);
    pastCutoff.setDate(pastCutoff.getDate() - rangeDef.days);
    const pastStr = pastCutoff.toISOString().split('T')[0];

    const futureCutoff = new Date(anchor);
    futureCutoff.setDate(futureCutoff.getDate() + rangeDef.days);
    const futureStr = futureCutoff.toISOString().split('T')[0];

    return weeksToGoalWithProjection.filter(d => d.date >= pastStr && d.date <= futureStr);
  }, [weeksToGoalWithProjection, timeRange, lastHistoricalDate]);

  // Always show projections regardless of time range
  const showProjections = true;

  // --- ZOOM STATE: trigger CSS pulse on range/view change ---
  const [animating, setAnimating] = useState(false);
  const prevRange = useRef(timeRange);
  const prevView = useRef(view);

  useEffect(() => {
    if (prevRange.current !== timeRange || prevView.current !== view) {
      prevRange.current = timeRange;
      prevView.current = view;
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [timeRange, view]);

  // --- DYNAMIC Y-AXIS: scale to fit visible data ---
  const yDomain = useMemo((): [number, number] => {
    if (view === 'weekstogoal') return [0, 100]; // handled separately
    const values = filteredData.map(d => {
      const val = Number(d[dataKey]) || 0;
      const projKey = view === 'subscribers' ? 'current_subs' : 'current_hours';
      const whatifKey = view === 'subscribers' ? 'whatif_subs' : 'whatif_hours';
      const proj = Number(d[projKey]) || 0;
      const whatif = Number(d[whatifKey]) || 0;
      return Math.max(val, proj, whatif);
    });
    const maxVal = Math.max(...values, goal);
    const headroom = maxVal * 0.15;
    const ceiling = Math.ceil((maxVal + headroom) / 100) * 100;
    return [0, Math.max(ceiling, 200)]; // minimum 200 so chart isn't too tight
  }, [filteredData, dataKey, view, goal]);

  // --- RANGE-AWARE X-AXIS FORMATTING ---
  const formatTickByRange = useMemo(() => {
    return (ts: number) => {
      const d = new Date(ts);
      switch (timeRange) {
        case '1M':
        case '3M':
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        case '6M':
        case '1Y':
          return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        case 'All':
          return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    };
  }, [timeRange]);

  const formatDateByRange = useMemo(() => {
    return (dateStr: string) => {
      const d = new Date(dateStr);
      switch (timeRange) {
        case '1M':
        case '3M':
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        case '6M':
        case '1Y':
          return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        case 'All':
          return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    };
  }, [timeRange]);

  const tickGap = timeRange === '1M' ? 40 : timeRange === '3M' ? 50 : 70;

  // --- GRID DENSITY PER RANGE ---
  const gridConfig = useMemo(() => {
    switch (timeRange) {
      case '1M':  return { vertical: true, horizontal: true, dash: '3 3' };
      case '3M':  return { vertical: true, horizontal: true, dash: '4 4' };
      case '6M':  return { vertical: false, horizontal: true, dash: '6 4' };
      case '1Y':  return { vertical: false, horizontal: true, dash: '6 4' };
      case 'All': return { vertical: false, horizontal: true, dash: '8 6' };
    }
  }, [timeRange]);

  const formatValue = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return Math.round(val).toString();
  };

  return (
    <div className="card w-full p-6">
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
                  px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 cursor-pointer active:scale-95
                  ${timeRange === range.key
                    ? 'bg-[var(--gold)] text-white'
                    : 'text-[var(--gray-600)] hover:text-[var(--foreground)] hover:scale-105'
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
                px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer active:scale-95
                ${view === 'subscribers'
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--foreground)] hover:scale-105'
                }
              `}
            >
              Subscribers
            </button>
            <button
              onClick={() => setView('watchtime')}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer active:scale-95
                ${view === 'watchtime'
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--foreground)] hover:scale-105'
                }
              `}
            >
              Watch Hours
            </button>
            <button
              onClick={() => setView('weekstogoal')}
              className={`
                px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer active:scale-95
                ${view === 'weekstogoal'
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'text-[var(--gray-600)] hover:text-[var(--foreground)] hover:scale-105'
                }
              `}
            >
              Weeks to Goal
            </button>
          </div>
        </div>
      </div>

      <div className={animating ? 'chart-zoom-transition' : 'chart-zoom-idle'} style={{ willChange: 'transform' }}>
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
                <CartesianGrid strokeDasharray={gridConfig.dash} stroke="var(--gray-200)" vertical={gridConfig.vertical} horizontal={gridConfig.horizontal} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateByRange}
                  tick={{ fontSize: 11, fill: 'var(--gray-600)' }}
                  interval="preserveStartEnd"
                  minTickGap={tickGap}
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
                  animationDuration={700}
                  animationEasing="ease-in-out"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="weeksToHoursGoal"
                  stroke="#1565C0"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#1565C0' }}
                  name="weeksToHoursGoal"
                  animationDuration={700}
                  animationEasing="ease-in-out"
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
              <CartesianGrid strokeDasharray={gridConfig.dash} stroke="var(--gray-200)" vertical={gridConfig.vertical} horizontal={gridConfig.horizontal} />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatTickByRange}
                tick={{ fontSize: 11, fill: 'var(--gray-600)' }}
                minTickGap={tickGap}
              />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: 11, fill: 'var(--gray-600)' }}
                width={50}
                domain={yDomain}
                allowDataOverflow={true}
                label={{
                  value: yAxisLabel,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 11, fill: 'var(--gray-500)', fontWeight: 500, textAnchor: 'middle' },
                }}
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

              {/* Goal line — dimmed, label on left near Y-axis */}
              <ReferenceLine
                y={goal}
                stroke="var(--gold)"
                strokeDasharray="12 6"
                strokeWidth={1.5}
                strokeOpacity={0.35}
                label={{
                  value: goalLabel,
                  position: 'insideTopLeft',
                  fontSize: 10,
                  fill: 'var(--gold)',
                  fontWeight: 500,
                  opacity: 0.6,
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
                animationDuration={700}
                animationEasing="ease-in-out"
              />

              {/* Projection lines */}
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
                    animationDuration={700}
                    animationEasing="ease-in-out"
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
                      animationDuration={700}
                      animationEasing="ease-in-out"
                    />
                  )}
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>

          {/* Projection legend */}
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
    </div>
  );
}
