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
  const totalDays = 240;

  // Channel started ~8 months ago
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

    // Viral spike around day 150
    if (i === 150) {
      subsGained = 50 + Math.floor(rand() * 15);
      subsLost = Math.floor(rand() * 3);
      watchHours = 100 + rand() * 30;
      views = 5200 + Math.floor(rand() * 2000);
    } else if (i === 151) {
      // Aftershock day
      subsGained = 18 + Math.floor(rand() * 8);
      subsLost = Math.floor(rand() * 2);
      watchHours = 40 + rand() * 15;
      views = 2500 + Math.floor(rand() * 1000);
    } else if (i === 152) {
      // Settling day
      subsGained = 10 + Math.floor(rand() * 5);
      subsLost = Math.floor(rand() * 2);
      watchHours = 25 + rand() * 10;
      views = 1200 + Math.floor(rand() * 500);
    } else if (i < 60) {
      // Phase 1: Slow start (months 1-2)
      subsGained = Math.floor(rand() * 2); // 0-1 subs/day
      subsLost = rand() < 0.15 ? 1 : 0;
      watchHours = 3 + rand() * 3;
      views = 50 + Math.floor(rand() * 150);
    } else if (i < 150) {
      // Phase 2: Gradual acceleration (months 3-5)
      subsGained = 1 + Math.floor(rand() * 2); // 1-2 subs/day
      subsLost = rand() < 0.1 ? 1 : 0;
      watchHours = 5 + rand() * 6;
      views = 200 + Math.floor(rand() * 300);
    } else {
      // Phase 3: Higher baseline after viral spike (months 6-8)
      subsGained = 2 + Math.floor(rand() * 3); // 2-4 subs/day
      subsLost = rand() < 0.12 ? 1 : 0;
      watchHours = 8 + rand() * 9;
      views = 400 + Math.floor(rand() * 600);
    }

    // Add weekend dips (lower activity on weekends)
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

  // For watch time, only count last 365 days (all data is within 365 days)
  const watchTimeHoursLast365Days = totalWatchTimeHours;

  const longFormRatio = 0.86; // ~86% long-form
  const longFormHours = Math.round(totalWatchTimeHours * longFormRatio);
  const shortsHours = Math.round(totalWatchTimeHours * (1 - longFormRatio));

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
    videosLast90Days: 16,
    postingCadenceDays: 5.5,
    avgVideoDurationMinutes: 8.3,
    avgViewsPerVideo: 3785,
    averageViewPercentage: 13.7,
    avgWatchHoursPerVideo: 29.4,
    topVideos: [
      { title: 'I Automated My Entire Dev Setup (Here\'s How)', views: 12400, watchHours: 186, publishedDaysAgo: 92 },
      { title: 'Stop Using Create React App in 2026', views: 8700, watchHours: 131, publishedDaysAgo: 65 },
      { title: 'The VS Code Extension That Changed Everything', views: 6200, watchHours: 93, publishedDaysAgo: 38 },
      { title: 'Why I Switched from TypeScript to Go', views: 5100, watchHours: 77, publishedDaysAgo: 120 },
      { title: 'Building a SaaS in 48 Hours — Full Breakdown', views: 4800, watchHours: 72, publishedDaysAgo: 145 },
    ],
  };
}
