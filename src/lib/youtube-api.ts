// YouTube Data API v3 and YouTube Analytics API client

const YT_DATA_API = 'https://www.googleapis.com/youtube/v3';
const YT_ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2';

export type ChannelInfo = {
  channelName: string;
  subscriberCount: number;
  totalViews: number;
  channelThumbnail: string;
};

export type DailyAnalyticsRow = {
  date: string; // YYYY-MM-DD
  subscribersGained: number;
  subscribersLost: number;
  watchTimeMinutes: number;
  views: number;
};

/**
 * Fetch channel info using YouTube Data API v3.
 */
export async function getChannelInfo(accessToken: string): Promise<ChannelInfo> {
  const url = new URL(`${YT_DATA_API}/channels`);
  url.searchParams.set('part', 'snippet,statistics');
  url.searchParams.set('mine', 'true');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `YouTube Data API error (${response.status}): ${error?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const channel = data.items?.[0];
  if (!channel) {
    throw new Error('No channel found for the authenticated user');
  }

  return {
    channelName: channel.snippet.title,
    subscriberCount: parseInt(channel.statistics.subscriberCount || '0', 10),
    totalViews: parseInt(channel.statistics.viewCount || '0', 10),
    channelThumbnail: channel.snippet.thumbnails?.default?.url || '',
  };
}

/**
 * Fetch daily analytics using YouTube Analytics API.
 * Uses creatorContentType filter to exclude Shorts watch time.
 */
export async function getDailyAnalytics(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<DailyAnalyticsRow[]> {
  const url = new URL(`${YT_ANALYTICS_API}/reports`);
  url.searchParams.set('ids', 'channel==MINE');
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('dimensions', 'day');
  url.searchParams.set(
    'metrics',
    'subscribersGained,subscribersLost,estimatedMinutesWatched,views'
  );
  url.searchParams.set('filters', 'creatorContentType==VIDEO_OF_ANY_LENGTH');
  url.searchParams.set('sort', 'day');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `YouTube Analytics API error (${response.status}): ${error?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const rows: DailyAnalyticsRow[] = (data.rows || []).map(
    (row: (string | number)[]) => ({
      date: row[0] as string,
      subscribersGained: row[1] as number,
      subscribersLost: row[2] as number,
      watchTimeMinutes: row[3] as number,
      views: row[4] as number,
    })
  );

  return rows;
}

/**
 * Fetch daily analytics WITHOUT the creatorContentType filter.
 * This includes Shorts, allowing comparison of Shorts vs long-form.
 */
export async function getAnalyticsWithShorts(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<DailyAnalyticsRow[]> {
  const url = new URL(`${YT_ANALYTICS_API}/reports`);
  url.searchParams.set('ids', 'channel==MINE');
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('dimensions', 'day');
  url.searchParams.set(
    'metrics',
    'subscribersGained,subscribersLost,estimatedMinutesWatched,views'
  );
  url.searchParams.set('sort', 'day');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `YouTube Analytics API error (${response.status}): ${error?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const rows: DailyAnalyticsRow[] = (data.rows || []).map(
    (row: (string | number)[]) => ({
      date: row[0] as string,
      subscribersGained: row[1] as number,
      subscribersLost: row[2] as number,
      watchTimeMinutes: row[3] as number,
      views: row[4] as number,
    })
  );

  return rows;
}
