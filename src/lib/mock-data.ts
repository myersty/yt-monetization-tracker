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

  const daily: DailyMetrics[] = [];
  let cumulativeSubs = 0;

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = formatDate(currentDate);

    let subsGained: number;
    let subsLost: number;
    let watchHours: number;
    let views: number;

    // Viral spike around day 650 (~21 months in)
    if (i === 650) {
      subsGained = 25 + Math.floor(rand() * 10);
      subsLost = Math.floor(rand() * 2);
      watchHours = 30 + rand() * 15;
      views = 2800 + Math.floor(rand() * 1200);
    } else if (i === 651) {
      // Aftershock day
      subsGained = 10 + Math.floor(rand() * 5);
      subsLost = Math.floor(rand() * 2);
      watchHours = 15 + rand() * 8;
      views = 1400 + Math.floor(rand() * 600);
    } else if (i === 652) {
      // Settling day
      subsGained = 5 + Math.floor(rand() * 3);
      subsLost = Math.floor(rand() * 2);
      watchHours = 8 + rand() * 5;
      views = 600 + Math.floor(rand() * 300);
    } else if (i < 180) {
      // Phase 1: First 6 months — very slow, just starting out
      subsGained = rand() < 0.3 ? 1 : 0;
      subsLost = rand() < 0.1 ? 1 : 0;
      watchHours = 0.3 + rand() * 0.6; // 0.3–0.9 hrs/day
      views = 10 + Math.floor(rand() * 25); // 10–35 views/day
    } else if (i < 450) {
      // Phase 2: Months 7–15 — slight improvement, finding a rhythm
      subsGained = rand() < 0.45 ? 1 : 0;
      subsLost = rand() < 0.08 ? 1 : 0;
      watchHours = 0.6 + rand() * 0.8; // 0.6–1.4 hrs/day
      views = 25 + Math.floor(rand() * 40); // 25–65 views/day
    } else if (i < 650) {
      // Phase 3: Months 16–21 — getting a bit better, some consistency
      subsGained = rand() < 0.5 ? 1 : (rand() < 0.15 ? 2 : 0);
      subsLost = rand() < 0.08 ? 1 : 0;
      watchHours = 1.0 + rand() * 1.2; // 1.0–2.2 hrs/day
      views = 40 + Math.floor(rand() * 55); // 40–95 views/day
    } else {
      // Phase 4: Months 22–30 — post-spike, slightly elevated baseline
      subsGained = rand() < 0.55 ? 1 : (rand() < 0.2 ? 2 : 0);
      subsLost = rand() < 0.1 ? 1 : 0;
      watchHours = 1.2 + rand() * 1.5; // 1.2–2.7 hrs/day
      views = 50 + Math.floor(rand() * 65); // 50–115 views/day
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
  const totalWatchTimeHours = daily.reduce((sum, d) => sum + (d.watchTimeHours || 0), 0);
  const totalViews = daily.reduce((sum, d) => sum + (d.views || 0), 0);

  // Rolling 365-day watch hours (only last year counts for YPP)
  const last365 = daily.slice(-365);
  const watchTimeHoursLast365Days = last365.reduce((sum, d) => sum + (d.watchTimeHours || 0), 0);

  const longFormRatio = 0.88; // ~88% long-form
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
    videosLast90Days: 7,
    postingCadenceDays: 12,
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
