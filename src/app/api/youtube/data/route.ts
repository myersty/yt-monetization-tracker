import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';
import { getChannelInfo, getDailyAnalytics, getWatchTimeByContentType, getRecentVideoCount, getAverageRetention, getRecentVideoDetails } from '@/lib/youtube-api';
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

    // Last 365 days for watch time calculation
    const watchTimeStart = new Date();
    watchTimeStart.setDate(watchTimeStart.getDate() - 365);
    const watchTimeStartStr = formatDate(watchTimeStart);

    // Fetch channel info first to get the channel creation date
    const channelInfo = await getChannelInfo(accessToken);

    // Use channel creation date as the lifetime start instead of hardcoded 2005-01-01
    const channelCreatedDate = new Date(channelInfo.channelCreatedAt);
    const lifetimeStartStr = formatDate(channelCreatedDate);

    // Fetch lifetime analytics and shorts breakdown in parallel
    const [lifetimeRows, shortsData] = await Promise.all([
      getDailyAnalytics(accessToken, lifetimeStartStr, endStr),
      getWatchTimeByContentType(accessToken, watchTimeStartStr, endStr).catch(() => null),
    ]);

    // Fetch recent video details, retention, and posting cadence in parallel
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = formatDate(ninetyDaysAgo);

    const [recentVideos, retentionData, videoDetails] = await Promise.all([
      getRecentVideoCount(accessToken, channelInfo.channelId, 90).catch(() => null),
      getAverageRetention(accessToken, ninetyDaysAgoStr, endStr).catch(() => null),
      getRecentVideoDetails(accessToken, channelInfo.channelId, 90).catch(() => null),
    ]);

    // Filter out leading days with zero activity (before channel had any real data)
    let firstActiveIndex = 0;
    for (let i = 0; i < lifetimeRows.length; i++) {
      const row = lifetimeRows[i];
      if (row.subscribersGained > 0 || row.subscribersLost > 0 || row.watchTimeMinutes > 0 || row.views > 0) {
        firstActiveIndex = i;
        break;
      }
    }
    const activeRows = lifetimeRows.slice(firstActiveIndex);

    // Convert YouTube Analytics data to DailyMetrics format (lifetime)
    let cumulativeSubscribers = 0;
    const daily: DailyMetrics[] = activeRows.map((row) => {
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
      videosLast90Days: recentVideos?.totalVideos,
      postingCadenceDays: recentVideos && recentVideos.totalVideos > 0
        ? 90 / recentVideos.totalVideos
        : undefined,
      avgVideoDurationMinutes: videoDetails?.avgDurationMinutes,
      avgViewsPerVideo: videoDetails?.avgViewsPerVideo,
      averageViewPercentage: retentionData?.averageViewPercentage,
    };

    // Compute average watch hours per video from real data
    if (parsedData.avgVideoDurationMinutes && parsedData.avgViewsPerVideo && parsedData.averageViewPercentage) {
      parsedData.avgWatchHoursPerVideo =
        (parsedData.avgVideoDurationMinutes * parsedData.avgViewsPerVideo * (parsedData.averageViewPercentage / 100)) / 60;
    }

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
