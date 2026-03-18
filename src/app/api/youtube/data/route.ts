import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';
import { getChannelInfo, getDailyAnalytics } from '@/lib/youtube-api';
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

    // Calculate date range: last 365 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    // Fetch channel info and daily analytics in parallel
    const [channelInfo, analyticsRows] = await Promise.all([
      getChannelInfo(accessToken),
      getDailyAnalytics(accessToken, startStr, endStr),
    ]);

    // Convert YouTube Analytics data to DailyMetrics format
    let cumulativeSubscribers = 0;
    const daily: DailyMetrics[] = analyticsRows.map((row) => {
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
    // The analytics API only gives gained/lost, so we need to offset
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

    const totalWatchTimeHours = daily.reduce(
      (sum, d) => sum + (d.watchTimeHours || 0),
      0
    );
    const totalViews = daily.reduce(
      (sum, d) => sum + (d.views || 0),
      0
    );

    const parsedData: ParsedData = {
      daily,
      totals: {
        currentSubscribers: channelInfo.subscriberCount,
        totalWatchTimeHours: totalWatchTimeHours,
        totalViews: totalViews,
      },
      dateRange: {
        start: daily[0]?.date || startStr,
        end: daily[daily.length - 1]?.date || endStr,
      },
      filesDetected: ['subscribers', 'watchtime', 'views'],
    };

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('YouTube data fetch error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error fetching YouTube data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
