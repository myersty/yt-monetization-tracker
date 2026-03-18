import { DailyMetrics, Projection, ProjectionPoint, OutlierInfo } from './types';

const SUBSCRIBER_GOAL = 1000;
const WATCH_HOURS_GOAL = 4000;

// ─── Linear Regression ──────────────────────────────────────────────────

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

function addDays(date: string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getCumulativeSubscribers(daily: DailyMetrics[]): number[] {
  // If we already have cumulative data, use it
  if (daily.some(d => (d.subscribers || 0) > 50)) {
    return daily.map(d => d.subscribers || 0);
  }

  // Build cumulative from gains/losses
  let cum = 0;
  return daily.map(d => {
    cum += (d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0);
    return cum;
  });
}

function getCumulativeWatchHours(daily: DailyMetrics[]): number[] {
  let cum = 0;
  return daily.map(d => {
    cum += d.watchTimeHours || 0;
    return cum;
  });
}

// ─── Outlier Detection ──────────────────────────────────────────────────

export function detectOutliers(daily: DailyMetrics[]): OutlierInfo[] {
  const outliers: OutlierInfo[] = [];

  // Subscriber outliers
  const subGains = daily.map(d => d.subscribersGained || 0).filter(v => v > 0);
  if (subGains.length > 7) {
    const mean = subGains.reduce((a, b) => a + b, 0) / subGains.length;
    const std = Math.sqrt(subGains.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / subGains.length);

    if (std > 0) {
      daily.forEach(d => {
        const val = d.subscribersGained || 0;
        const z = (val - mean) / std;
        if (z > 3) {
          outliers.push({ date: d.date, metric: 'subscribers', value: val, zScore: z });
        }
      });
    }
  }

  // Watch time outliers
  const wtValues = daily.map(d => d.watchTimeHours || 0).filter(v => v > 0);
  if (wtValues.length > 7) {
    const mean = wtValues.reduce((a, b) => a + b, 0) / wtValues.length;
    const std = Math.sqrt(wtValues.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / wtValues.length);

    if (std > 0) {
      daily.forEach(d => {
        const val = d.watchTimeHours || 0;
        const z = (val - mean) / std;
        if (z > 3) {
          outliers.push({ date: d.date, metric: 'watchtime', value: val, zScore: z });
        }
      });
    }
  }

  return outliers;
}

// ─── Conservative Projection (All-Time Linear Regression) ───────────────

function conservativeProjection(daily: DailyMetrics[]): Projection {
  const cumSubs = getCumulativeSubscribers(daily);
  const cumHours = getCumulativeWatchHours(daily);
  const lastDate = daily[daily.length - 1]?.date || '';
  const currentSubs = cumSubs[cumSubs.length - 1] || 0;
  const currentHours = cumHours[cumHours.length - 1] || 0;

  // Fit lines to cumulative data
  const subPoints = cumSubs.map((y, x) => ({ x, y }));
  const hourPoints = cumHours.map((y, x) => ({ x, y }));

  const subLine = linearRegression(subPoints);
  const hourLine = linearRegression(hourPoints);

  // Project subscriber crossing
  const subsAlready = currentSubs >= SUBSCRIBER_GOAL;
  let subDate: Date | null = null;
  let subDaysRemaining: number | null = null;
  if (!subsAlready && subLine.slope > 0) {
    const daysToGoal = (SUBSCRIBER_GOAL - (subLine.slope * (daily.length - 1) + subLine.intercept)) / subLine.slope;
    if (daysToGoal > 0) {
      subDaysRemaining = Math.ceil(daysToGoal);
      subDate = addDays(lastDate, subDaysRemaining);
    }
  }

  // Project watch hours crossing
  const hoursAlready = currentHours >= WATCH_HOURS_GOAL;
  let hourDate: Date | null = null;
  let hourDaysRemaining: number | null = null;
  if (!hoursAlready && hourLine.slope > 0) {
    const daysToGoal = (WATCH_HOURS_GOAL - (hourLine.slope * (daily.length - 1) + hourLine.intercept)) / hourLine.slope;
    if (daysToGoal > 0) {
      hourDaysRemaining = Math.ceil(daysToGoal);
      hourDate = addDays(lastDate, hourDaysRemaining);
    }
  }

  // Monetization date is the later of the two
  let monetizationDate: Date | null = null;
  if (subsAlready && hoursAlready) {
    monetizationDate = new Date(); // already eligible
  } else if (subDate && hourDate) {
    monetizationDate = subDate > hourDate ? subDate : hourDate;
  } else {
    monetizationDate = subDate || hourDate;
  }

  return {
    model: 'conservative',
    label: 'Conservative (All-Time Trend)',
    subscriberProjection: {
      estimatedDate: subDate,
      dailyRate: subLine.slope,
      daysRemaining: subDaysRemaining,
      alreadyAchieved: subsAlready,
    },
    watchTimeProjection: {
      estimatedDate: hourDate,
      dailyRate: hourLine.slope,
      daysRemaining: hourDaysRemaining,
      alreadyAchieved: hoursAlready,
    },
    monetizationDate,
  };
}

// ─── Current Trend (Weighted Last 30-90 Days) ───────────────────────────

function currentTrendProjection(daily: DailyMetrics[]): Projection {
  const windowSize = Math.min(90, daily.length);
  const recentDays = daily.slice(-windowSize);
  const cumSubs = getCumulativeSubscribers(daily);
  const cumHours = getCumulativeWatchHours(daily);
  const lastDate = daily[daily.length - 1]?.date || '';
  const currentSubs = cumSubs[cumSubs.length - 1] || 0;
  const currentHours = cumHours[cumHours.length - 1] || 0;

  // Exponentially weighted daily rates
  const alpha = 2 / (windowSize + 1); // EMA smoothing factor
  let subRate = 0;
  let hourRate = 0;

  for (let i = 0; i < recentDays.length; i++) {
    const d = recentDays[i];
    const dailySubs = (d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0);
    const dailyHours = d.watchTimeHours || 0;

    subRate = alpha * dailySubs + (1 - alpha) * subRate;
    hourRate = alpha * dailyHours + (1 - alpha) * hourRate;
  }

  const subsAlready = currentSubs >= SUBSCRIBER_GOAL;
  let subDate: Date | null = null;
  let subDaysRemaining: number | null = null;
  if (!subsAlready && subRate > 0) {
    subDaysRemaining = Math.ceil((SUBSCRIBER_GOAL - currentSubs) / subRate);
    subDate = addDays(lastDate, subDaysRemaining);
  }

  const hoursAlready = currentHours >= WATCH_HOURS_GOAL;
  let hourDate: Date | null = null;
  let hourDaysRemaining: number | null = null;
  if (!hoursAlready && hourRate > 0) {
    hourDaysRemaining = Math.ceil((WATCH_HOURS_GOAL - currentHours) / hourRate);
    hourDate = addDays(lastDate, hourDaysRemaining);
  }

  let monetizationDate: Date | null = null;
  if (subsAlready && hoursAlready) {
    monetizationDate = new Date();
  } else if (subDate && hourDate) {
    monetizationDate = subDate > hourDate ? subDate : hourDate;
  } else {
    monetizationDate = subDate || hourDate;
  }

  return {
    model: 'current',
    label: 'Current Pace (Last 90 Days)',
    subscriberProjection: {
      estimatedDate: subDate,
      dailyRate: subRate,
      daysRemaining: subDaysRemaining,
      alreadyAchieved: subsAlready,
    },
    watchTimeProjection: {
      estimatedDate: hourDate,
      dailyRate: hourRate,
      daysRemaining: hourDaysRemaining,
      alreadyAchieved: hoursAlready,
    },
    monetizationDate,
  };
}

// ─── Optimistic (Best 30-Day Window) ────────────────────────────────────

function optimisticProjection(daily: DailyMetrics[]): Projection {
  const cumSubs = getCumulativeSubscribers(daily);
  const cumHours = getCumulativeWatchHours(daily);
  const lastDate = daily[daily.length - 1]?.date || '';
  const currentSubs = cumSubs[cumSubs.length - 1] || 0;
  const currentHours = cumHours[cumHours.length - 1] || 0;

  // Find best 30-day window for each metric
  const windowSize = Math.min(30, Math.floor(daily.length / 2));
  let bestSubRate = 0;
  let bestHourRate = 0;

  for (let i = 0; i <= daily.length - windowSize; i++) {
    const window = daily.slice(i, i + windowSize);
    const subGain = window.reduce((sum, d) =>
      sum + (d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0), 0);
    const hourGain = window.reduce((sum, d) => sum + (d.watchTimeHours || 0), 0);

    const subDailyRate = subGain / windowSize;
    const hourDailyRate = hourGain / windowSize;

    if (subDailyRate > bestSubRate) bestSubRate = subDailyRate;
    if (hourDailyRate > bestHourRate) bestHourRate = hourDailyRate;
  }

  const subsAlready = currentSubs >= SUBSCRIBER_GOAL;
  let subDate: Date | null = null;
  let subDaysRemaining: number | null = null;
  if (!subsAlready && bestSubRate > 0) {
    subDaysRemaining = Math.ceil((SUBSCRIBER_GOAL - currentSubs) / bestSubRate);
    subDate = addDays(lastDate, subDaysRemaining);
  }

  const hoursAlready = currentHours >= WATCH_HOURS_GOAL;
  let hourDate: Date | null = null;
  let hourDaysRemaining: number | null = null;
  if (!hoursAlready && bestHourRate > 0) {
    hourDaysRemaining = Math.ceil((WATCH_HOURS_GOAL - currentHours) / bestHourRate);
    hourDate = addDays(lastDate, hourDaysRemaining);
  }

  let monetizationDate: Date | null = null;
  if (subsAlready && hoursAlready) {
    monetizationDate = new Date();
  } else if (subDate && hourDate) {
    monetizationDate = subDate > hourDate ? subDate : hourDate;
  } else {
    monetizationDate = subDate || hourDate;
  }

  return {
    model: 'optimistic',
    label: 'Optimistic (Best 30-Day Pace)',
    subscriberProjection: {
      estimatedDate: subDate,
      dailyRate: bestSubRate,
      daysRemaining: subDaysRemaining,
      alreadyAchieved: subsAlready,
    },
    watchTimeProjection: {
      estimatedDate: hourDate,
      dailyRate: bestHourRate,
      daysRemaining: hourDaysRemaining,
      alreadyAchieved: hoursAlready,
    },
    monetizationDate,
  };
}

// ─── Generate Projection Points for Charts ──────────────────────────────

export function generateProjectionPoints(
  daily: DailyMetrics[],
  projections: Projection[],
  projectionDays: number = 365
): ProjectionPoint[] {
  const cumSubs = getCumulativeSubscribers(daily);
  const cumHours = getCumulativeWatchHours(daily);
  const lastDate = daily[daily.length - 1]?.date || '';
  const lastSubs = cumSubs[cumSubs.length - 1] || 0;
  const lastHours = cumHours[cumHours.length - 1] || 0;

  // Historical points
  const historical: ProjectionPoint[] = daily.map((d, i) => ({
    date: d.date,
    subscribers: cumSubs[i],
    watchTimeHours: cumHours[i],
  }));

  // Future projection points (every 7 days to keep chart smooth but not bloated)
  const futurePoints: ProjectionPoint[] = [];
  const conservative = projections.find(p => p.model === 'conservative');
  const current = projections.find(p => p.model === 'current');
  const optimistic = projections.find(p => p.model === 'optimistic');

  for (let day = 0; day <= projectionDays; day += 7) {
    const date = formatDate(addDays(lastDate, day));

    const point: ProjectionPoint = { date };

    if (conservative) {
      point.conservative_subs = Math.min(
        lastSubs + conservative.subscriberProjection.dailyRate * day,
        SUBSCRIBER_GOAL * 1.2
      );
      point.conservative_hours = Math.min(
        lastHours + conservative.watchTimeProjection.dailyRate * day,
        WATCH_HOURS_GOAL * 1.2
      );
    }

    if (current) {
      point.current_subs = Math.min(
        lastSubs + current.subscriberProjection.dailyRate * day,
        SUBSCRIBER_GOAL * 1.2
      );
      point.current_hours = Math.min(
        lastHours + current.watchTimeProjection.dailyRate * day,
        WATCH_HOURS_GOAL * 1.2
      );
    }

    if (optimistic) {
      point.optimistic_subs = Math.min(
        lastSubs + optimistic.subscriberProjection.dailyRate * day,
        SUBSCRIBER_GOAL * 1.2
      );
      point.optimistic_hours = Math.min(
        lastHours + optimistic.watchTimeProjection.dailyRate * day,
        WATCH_HOURS_GOAL * 1.2
      );
    }

    futurePoints.push(point);
  }

  return [...historical, ...futurePoints];
}

// ─── Main Export ─────────────────────────────────────────────────────────

export function calculateProjections(daily: DailyMetrics[]): Projection[] {
  if (daily.length < 3) return [];

  return [
    conservativeProjection(daily),
    currentTrendProjection(daily),
    optimisticProjection(daily),
  ];
}
