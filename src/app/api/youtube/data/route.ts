import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';
import { getChannelInfo, getDailyAnalytics, getWatchTimeByContentType } from '@/lib/youtube-api';
import type { DailyMetrics, ParsedData } from '@/lib/types';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Date ranges
    const endDate = new Date();
    const endStr = formatDate(endDate);

    // Lifetime start: as far back as the API allows
    const lifetimeStartStr = '2005-01-01';

    // Last 365 days for watch time calculation
    const watchTimeStart = new Date();
    watchTimeStart.setDate(watchTimeStart.getDate() - 365);
    const watchTimeStartStr = formatDate(watchTimeStart);

    // Fetch channel info, lifetime analytics, and shorts breakdown in parallel
    const [channelInfo, lifetimeRows, shortsData] = await Promise.all([
      getChannelInfo(accessToken),
      getDailyAnalytics(accessToken, lifetimeStartStr, endStr),
      getWatchTimeByContentType(accessToken, watchTimeStartStr, endStr).catch(() => null),
    ]);

    // Convert YouTube Analytics data to DailyMetrics format (lifetime)
    let cumulativeSubscribers = 0;
    const daily: DailyMetrics[] = lifetimeRows.map((row) => {
      const net = row.subscribersGained - row.subscribersLost;
      cumulativeSubscribers += net;

      return {
        date: row.date,
        subscribers: cumulativeSubscribers,
        subscribersGained: row.subscribersGained,
        subscribersLost: row.subscribersLost,
        watchTimeHours: row.watchTimeMinutes / 60,
        views: row.views,
      };
    });

    // Adjust cumulative subscribers so the last day matches the actual count
    if (daily.length > 0) {
      const lastCumulative = daily[daily.length - 1].subscribers || 0;
      const actualSubs = channelInfo.subscriberCount;
      const offset = actualSubs - lastCumulative;
      for (const day of daily) {
        if (day.subscribers !== undefined) {
          day.subscribers += offset;
        }
      }
    }

    // Calculate watch time for last 365 days only (long-form for monetization)
    const last365Days = daily.filter(d => d.date >= watchTimeStartStr);
    const totalWatchTimeHoursAll = last365Days.reduce(
      (sum, d) => sum + (d.watchTimeHours || 0),
      0
    );

    // If we have shorts breakdown, use long-form only; otherwise use total
    const longFormWatchTimeHours = shortsData
      ? shortsData.longForm
      : totalWatchTimeHoursAll;

    const totalViews = last365Days.reduce(
      (sum, d) => sum + (d.views || 0),
      0
    );

    const parsedData: ParsedData = {
      daily,
      totals: {
        currentSubscribers: channelInfo.subscriberCount,
        totalWatchTimeHours: longFormWatchTimeHours,
        totalViews: totalViews,
      },
      dateRange: {
        start: daily[0]?.date || lifetimeStartStr,
        end: daily[daily.length - 1]?.date || endStr,
      },
      filesDetected: ['subscribers', 'watchtime', 'views'],
      watchTimeHoursLast365Days: longFormWatchTimeHours,
      channelName: channelInfo.channelName,
      channelThumbnail: channelInfo.channelThumbnail,
    };

    // Add shorts breakdown if available
    if (shortsData) {
      parsedData.shortsBreakdown = {
        shortsWatchTimeHours: shortsData.shorts,
        longFormWatchTimeHours: shortsData.longForm,
        totalWatchTimeHours: shortsData.total,
      };
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('YouTube data fetch error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error fetching YouTube data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
