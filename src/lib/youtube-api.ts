// YouTube Data API v3 and YouTube Analytics API client

const YT_DATA_API = 'https://www.googleapis.com/youtube/v3';
const YT_ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2';

export type ChannelInfo = {
  channelId: string;
  channelName: string;
  subscriberCount: number;
  totalViews: number;
  channelThumbnail: string;
  channelCreatedAt: string; // ISO date from snippet.publishedAt
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
    channelId: channel.id,
    channelName: channel.snippet.title,
    subscriberCount: parseInt(channel.statistics.subscriberCount || '0', 10),
    totalViews: parseInt(channel.statistics.viewCount || '0', 10),
    channelThumbnail: channel.snippet.thumbnails?.default?.url || '',
    channelCreatedAt: channel.snippet.publishedAt || '2005-01-01T00:00:00Z',
  };
}

/**
 * Fetch daily analytics using YouTube Analytics API.
 * Fetches all content types (long-form + Shorts) since the creatorContentType
 * filter is not supported with the day dimension. Shorts filtering will be
 * handled separately using the creatorContentType dimension query.
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
 * Fetch watch time broken down by content type (Shorts vs long-form).
 * Uses the creatorContentType dimension to separate SHORTS from VIDEO_OF_ANY_LENGTH.
 */
export async function getWatchTimeByContentType(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<{ longForm: number; shorts: number; total: number }> {
  const url = new URL(`${YT_ANALYTICS_API}/reports`);
  url.searchParams.set('ids', 'channel==MINE');
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('dimensions', 'creatorContentType');
  url.searchParams.set('metrics', 'estimatedMinutesWatched');

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
  let longFormMinutes = 0;
  let shortsMinutes = 0;

  for (const row of data.rows || []) {
    const contentType = row[0] as string;
    const minutes = row[1] as number;
    if (contentType === 'SHORTS') {
      shortsMinutes += minutes;
    } else {
      // VIDEO_OF_ANY_LENGTH or any other type counts as long-form
      longFormMinutes += minutes;
    }
  }

  return {
    longForm: longFormMinutes / 60,
    shorts: shortsMinutes / 60,
    total: (longFormMinutes + shortsMinutes) / 60,
  };
}

/**
 * Fetch the number of videos published in the last N days using YouTube Data API v3 search.list.
 */
export async function getRecentVideoCount(
  accessToken: string,
  channelId: string,
  daysBack: number
): Promise<{ totalVideos: number; daysBack: number }> {
  const now = new Date();
  const past = new Date();
  past.setDate(past.getDate() - daysBack);

  const url = new URL(`${YT_DATA_API}/search`);
  url.searchParams.set('part', 'id');
  url.searchParams.set('channelId', channelId);
  url.searchParams.set('type', 'video');
  url.searchParams.set('publishedAfter', past.toISOString());
  url.searchParams.set('publishedBefore', now.toISOString());
  url.searchParams.set('maxResults', '1');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `YouTube Data API search error (${response.status}): ${error?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const totalVideos = data.pageInfo?.totalResults ?? 0;

  return { totalVideos, daysBack };
}
