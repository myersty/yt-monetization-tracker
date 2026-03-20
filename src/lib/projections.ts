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

function addDays(date: string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getCumulativeSubscribers(daily: DailyMetrics[]): number[] {
  if (daily.some(d => (d.subscribers || 0) > 50)) {
    return daily.map(d => d.subscribers || 0);
  }
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

// ─── Curved Projection Math ──────────────────────────────────────────────
// Projects a metric forward with acceleration that dampens over time.
// rate(day) = baseRate + acceleration * (1 - e^(-day/halfLife)) * halfLife
// This curves up if accelerating, flattens out over ~90 days.

const DAMPING_HALF_LIFE = 90; // acceleration effect flattens over ~90 days

/** Cumulative gain after `days` with dampened acceleration */
function curvedCumulative(baseRate: number, acceleration: number, days: number): number {
  if (acceleration === 0 || days === 0) return baseRate * days;

  // Integral of: baseRate + acceleration * halfLife * (1 - e^(-t/halfLife))
  // = baseRate*t + acceleration*halfLife * (t + halfLife*e^(-t/halfLife) - halfLife)
  const h = DAMPING_HALF_LIFE;
  const t = days;
  return baseRate * t + acceleration * h * (t + h * Math.exp(-t / h) - h);
}

/** Find days until curvedCumulative reaches `target` (binary search) */
function daysToReachTarget(baseRate: number, acceleration: number, target: number): number | null {
  if (target <= 0) return 0;
  if (baseRate <= 0 && acceleration <= 0) return null;

  // Upper bound: try linear estimate first, then expand if needed
  let lo = 0;
  let hi = baseRate > 0 ? Math.ceil(target / baseRate) * 3 : 3650;
  hi = Math.max(hi, 365);
  hi = Math.min(hi, 3650); // cap at 10 years

  // Make sure hi is actually enough
  if (curvedCumulative(baseRate, acceleration, hi) < target) {
    return null; // can't reach in 10 years
  }

  // Binary search
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (curvedCumulative(baseRate, acceleration, mid) >= target) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return Math.ceil(hi);
}

// ─── Outlier Detection ──────────────────────────────────────────────────

export function detectOutliers(daily: DailyMetrics[]): OutlierInfo[] {
  const outliers: OutlierInfo[] = [];

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

// ─── Compute Acceleration from 90-Day Window ─────────────────────────────
// Split last 90 days into two 45-day halves, compare avg daily rates.

function computeAcceleration(recentDays: DailyMetrics[]): { subAccel: number; hourAccel: number } {
  const mid = Math.floor(recentDays.length / 2);
  const firstHalf = recentDays.slice(0, mid);
  const secondHalf = recentDays.slice(mid);

  const firstSubRate = firstHalf.reduce((s, d) =>
    s + (d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0), 0) / (firstHalf.length || 1);
  const secondSubRate = secondHalf.reduce((s, d) =>
    s + (d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0), 0) / (secondHalf.length || 1);

  const firstHourRate = firstHalf.reduce((s, d) => s + (d.watchTimeHours || 0), 0) / (firstHalf.length || 1);
  const secondHourRate = secondHalf.reduce((s, d) => s + (d.watchTimeHours || 0), 0) / (secondHalf.length || 1);

  // Acceleration = change in daily rate per day over the half-window
  // Normalize by the half-window length so it's "rate change per day"
  const halfDays = mid || 1;
  const subAccel = (secondSubRate - firstSubRate) / halfDays;
  const hourAccel = (secondHourRate - firstHourRate) / halfDays;

  return { subAccel, hourAccel };
}

// ─── Conservative Projection (All-Time Linear Regression) ───────────────

function conservativeProjection(daily: DailyMetrics[]): Projection {
  const cumSubs = getCumulativeSubscribers(daily);
  const cumHours = getCumulativeWatchHours(daily);
  const lastDate = daily[daily.length - 1]?.date || '';
  const currentSubs = cumSubs[cumSubs.length - 1] || 0;
  const currentHours = cumHours[cumHours.length - 1] || 0;

  const subPoints = cumSubs.map((y, x) => ({ x, y }));
  const hourPoints = cumHours.map((y, x) => ({ x, y }));

  const subLine = linearRegression(subPoints);
  const hourLine = linearRegression(hourPoints);

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

  let monetizationDate: Date | null = null;
  if (subsAlready && hoursAlready) {
    monetizationDate = new Date();
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
      acceleration: 0,
      daysRemaining: subDaysRemaining,
      alreadyAchieved: subsAlready,
    },
    watchTimeProjection: {
      estimatedDate: hourDate,
      dailyRate: hourLine.slope,
      acceleration: 0,
      daysRemaining: hourDaysRemaining,
      alreadyAchieved: hoursAlready,
    },
    monetizationDate,
  };
}

// ─── Current Trend (Last 90 Days with Acceleration) ──────────────────────

function currentTrendProjection(daily: DailyMetrics[]): Projection {
  const windowSize = Math.min(90, daily.length);
  const recentDays = daily.slice(-windowSize);
  const cumSubs = getCumulativeSubscribers(daily);
  const cumHours = getCumulativeWatchHours(daily);
  const lastDate = daily[daily.length - 1]?.date || '';
  const currentSubs = cumSubs[cumSubs.length - 1] || 0;
  const currentHours = cumHours[cumHours.length - 1] || 0;

  // EMA for current daily rate
  const alpha = 2 / (windowSize + 1);
  let subRate = 0;
  let hourRate = 0;

  for (let i = 0; i < recentDays.length; i++) {
    const d = recentDays[i];
    const dailySubs = (d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0);
    const dailyHours = d.watchTimeHours || 0;
    subRate = alpha * dailySubs + (1 - alpha) * subRate;
    hourRate = alpha * dailyHours + (1 - alpha) * hourRate;
  }

  // Compute acceleration from first half vs second half
  const { subAccel, hourAccel } = computeAcceleration(recentDays);

  // Project with curved math
  const subsAlready = currentSubs >= SUBSCRIBER_GOAL;
  const subsNeeded = SUBSCRIBER_GOAL - currentSubs;
  let subDate: Date | null = null;
  let subDaysRemaining: number | null = null;
  if (!subsAlready && subRate > 0) {
    subDaysRemaining = daysToReachTarget(subRate, subAccel, subsNeeded);
    if (subDaysRemaining !== null) {
      subDate = addDays(lastDate, subDaysRemaining);
    }
  }

  const hoursAlready = currentHours >= WATCH_HOURS_GOAL;
  const hoursNeeded = WATCH_HOURS_GOAL - currentHours;
  let hourDate: Date | null = null;
  let hourDaysRemaining: number | null = null;
  if (!hoursAlready && hourRate > 0) {
    hourDaysRemaining = daysToReachTarget(hourRate, hourAccel, hoursNeeded);
    if (hourDaysRemaining !== null) {
      hourDate = addDays(lastDate, hourDaysRemaining);
    }
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
      acceleration: subAccel,
      daysRemaining: subDaysRemaining,
      alreadyAchieved: subsAlready,
    },
    watchTimeProjection: {
      estimatedDate: hourDate,
      dailyRate: hourRate,
      acceleration: hourAccel,
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
      acceleration: 0,
      daysRemaining: subDaysRemaining,
      alreadyAchieved: subsAlready,
    },
    watchTimeProjection: {
      estimatedDate: hourDate,
      dailyRate: bestHourRate,
      acceleration: 0,
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
  projectionDays: number = 365,
  whatIfRates?: { dailyNewSubs: number; dailyWatchHours: number } | null
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

  // Future projection points
  const futurePoints: ProjectionPoint[] = [];
  const conservative = projections.find(p => p.model === 'conservative');
  const current = projections.find(p => p.model === 'current');
  const optimistic = projections.find(p => p.model === 'optimistic');

  for (let day = 0; day <= projectionDays; day += 7) {
    const date = formatDate(addDays(lastDate, day));

    const point: ProjectionPoint = { date };

    // Conservative & Optimistic: still linear (no acceleration data)
    if (conservative) {
      point.conservative_subs = lastSubs + conservative.subscriberProjection.dailyRate * day;
      point.conservative_hours = lastHours + conservative.watchTimeProjection.dailyRate * day;
    }

    if (optimistic) {
      point.optimistic_subs = lastSubs + optimistic.subscriberProjection.dailyRate * day;
      point.optimistic_hours = lastHours + optimistic.watchTimeProjection.dailyRate * day;
    }

    // Current pace: curved projection using acceleration
    if (current) {
      point.current_subs = lastSubs + curvedCumulative(
        current.subscriberProjection.dailyRate,
        current.subscriberProjection.acceleration,
        day
      );
      point.current_hours = lastHours + curvedCumulative(
        current.watchTimeProjection.dailyRate,
        current.watchTimeProjection.acceleration,
        day
      );
    }

    // What-If: still linear (user-controlled scenario)
    if (whatIfRates) {
      point.whatif_subs = lastSubs + whatIfRates.dailyNewSubs * day;
      point.whatif_hours = lastHours + whatIfRates.dailyWatchHours * day;
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
