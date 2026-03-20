import { ParsedData, DailyMetrics } from './types';

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function generateMockData(): ParsedData {
  const rand = seededRandom(42);
  const totalDays = 912; // ~2.5 years

  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - totalDays + 1);

  // Target last-90-day stats:
  // - 116 net subs gained
  // - 4,812 views
  // - Watch hours derived: ~4812 views * 7.2 min avg * 0.32 retention / 60 = ~185 hrs
  // That's ~2.05 hrs/day, ~53.5 views/day, ~1.29 subs/day over 90 days

  const daily: DailyMetrics[] = [];
  let cumulativeSubs = 0;
  const last90Start = totalDays - 90;

  // Pre-calculate: we want ~435 total subs at end, ~116 in last 90 days
  // So ~319 subs accumulated in first 822 days (~0.39/day avg for older period)

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = formatDate(currentDate);

    let subsGained: number;
    let subsLost: number;
    let watchHours: number;
    let views: number;

    if (i >= last90Start) {
      // Last 90 days: calibrated to hit targets
      // Target: 116 subs / 90 days = ~1.29/day, 4812 views / 90 = ~53.5/day
      // Watch hours: ~2.2/day to get ~200 hrs over 90 days
      // ~1.3 subs/day target (116 over 90 days)
      const subRoll = rand();
      subsGained = subRoll < 0.46 ? 2 : subRoll < 0.86 ? 1 : 0;
      subsLost = rand() < 0.03 ? 1 : 0;
      watchHours = 1.7 + rand() * 1.3; // 1.7–3.0 hrs/day
      views = 43 + Math.floor(rand() * 34); // 43–77 views/day
    } else if (i < 180) {
      // Phase 1: First 6 months — just starting out
      subsGained = rand() < 0.25 ? 1 : 0;
      subsLost = rand() < 0.1 ? 1 : 0;
      watchHours = 0.2 + rand() * 0.4; // 0.2–0.6 hrs/day
      views = 8 + Math.floor(rand() * 18); // 8–26 views/day
    } else if (i < 450) {
      // Phase 2: Months 7–15 — finding a rhythm
      subsGained = rand() < 0.35 ? 1 : 0;
      subsLost = rand() < 0.08 ? 1 : 0;
      watchHours = 0.4 + rand() * 0.6; // 0.4–1.0 hrs/day
      views = 15 + Math.floor(rand() * 25); // 15–40 views/day
    } else if (i < 650) {
      // Phase 3: Months 16–21 — getting a bit better
      subsGained = rand() < 0.45 ? 1 : (rand() < 0.1 ? 2 : 0);
      subsLost = rand() < 0.08 ? 1 : 0;
      watchHours = 0.6 + rand() * 0.8; // 0.6–1.4 hrs/day
      views = 22 + Math.floor(rand() * 35); // 22–57 views/day
    } else {
      // Phase 4: Months 22–27 — modest improvement before last 90 days
      subsGained = rand() < 0.5 ? 1 : (rand() < 0.15 ? 2 : 0);
      subsLost = rand() < 0.08 ? 1 : 0;
      watchHours = 0.8 + rand() * 1.0; // 0.8–1.8 hrs/day
      views = 28 + Math.floor(rand() * 40); // 28–68 views/day
    }

    // Weekend dips
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      views = Math.floor(views * (0.6 + rand() * 0.2));
      watchHours = watchHours * (0.65 + rand() * 0.2);
    }

    cumulativeSubs += subsGained - subsLost;

    daily.push({
      date: dateStr,
      subscribers: cumulativeSubs,
      subscribersGained: subsGained,
      subscribersLost: subsLost,
      watchTimeHours: Math.round(watchHours * 100) / 100,
      views,
    });
  }

  // Compute totals
  const currentSubscribers = cumulativeSubs;
  const totalViews = daily.reduce((sum, d) => sum + (d.views || 0), 0);

  // Rolling 365-day watch hours (only last year counts for YPP)
  const last365 = daily.slice(-365);
  const watchTimeHoursLast365Days = last365.reduce((sum, d) => sum + (d.watchTimeHours || 0), 0);

  const longFormRatio = 0.90; // ~90% long-form
  const longFormHours = Math.round(watchTimeHoursLast365Days * longFormRatio);
  const shortsHours = Math.round(watchTimeHoursLast365Days * (1 - longFormRatio));

  return {
    daily,
    totals: {
      currentSubscribers,
      totalWatchTimeHours: longFormHours,
      totalViews: totalViews,
    },
    dateRange: {
      start: formatDate(startDate),
      end: formatDate(endDate),
    },
    filesDetected: ['subscribers', 'watchtime', 'views'],
    watchTimeHoursLast365Days: longFormHours,
    shortsBreakdown: {
      longFormWatchTimeHours: longFormHours,
      shortsWatchTimeHours: shortsHours,
      totalWatchTimeHours: longFormHours + shortsHours,
    },
    channelName: 'TechTalk with Alex',
    channelThumbnail: '',
    videosLast90Days: 13,
    postingCadenceDays: 7,
    avgVideoDurationMinutes: 7.2,
    avgViewsPerVideo: 420,
    averageViewPercentage: 32,
    avgWatchHoursPerVideo: 3.2,
    topVideos: [
      { title: 'I Automated My Entire Dev Setup (Here\'s How)', views: 3200, watchHours: 38, publishedDaysAgo: 92 },
      { title: 'Stop Using Create React App in 2026', views: 1800, watchHours: 22, publishedDaysAgo: 65 },
      { title: 'The VS Code Extension That Changed Everything', views: 1400, watchHours: 17, publishedDaysAgo: 38 },
      { title: 'Why I Switched from TypeScript to Go', views: 1100, watchHours: 13, publishedDaysAgo: 210 },
      { title: 'Building a SaaS in 48 Hours — Full Breakdown', views: 950, watchHours: 11, publishedDaysAgo: 320 },
    ],
  };
}
