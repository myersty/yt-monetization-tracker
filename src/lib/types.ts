export type DailyMetrics = {
  date: string; // YYYY-MM-DD
  subscribers?: number; // cumulative total
  subscribersGained?: number;
  subscribersLost?: number;
  watchTimeHours?: number;
  views?: number;
};

export type ShortsBreakdown = {
  shortsWatchTimeHours: number;
  longFormWatchTimeHours: number;
  totalWatchTimeHours: number;
};

export type ParsedData = {
  daily: DailyMetrics[];
  totals: {
    currentSubscribers: number;
    totalWatchTimeHours: number; // long-form only (last 365 days)
    totalViews: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
  filesDetected: CSVFileType[];
  /** Watch time for last 365 days (long-form only). Same as totals.totalWatchTimeHours for API data. */
  watchTimeHoursLast365Days?: number;
  /** Shorts vs long-form breakdown (only available from API, not CSV) */
  shortsBreakdown?: ShortsBreakdown;
  /** Channel info passed through from the API */
  channelName?: string;
  channelThumbnail?: string;
};

export type CSVFileType = 'subscribers' | 'watchtime' | 'views' | 'unknown';

export type ProjectionModel = 'conservative' | 'current' | 'optimistic';

export type Projection = {
  model: ProjectionModel;
  label: string;
  subscriberProjection: {
    estimatedDate: Date | null;
    dailyRate: number;
    daysRemaining: number | null;
    alreadyAchieved: boolean;
  };
  watchTimeProjection: {
    estimatedDate: Date | null;
    dailyRate: number;
    daysRemaining: number | null;
    alreadyAchieved: boolean;
  };
  monetizationDate: Date | null; // later of the two dates
};

export type ProjectionPoint = {
  date: string;
  subscribers?: number;
  watchTimeHours?: number;
  conservative_subs?: number;
  conservative_hours?: number;
  current_subs?: number;
  current_hours?: number;
  optimistic_subs?: number;
  optimistic_hours?: number;
};

export type OutlierInfo = {
  date: string;
  metric: 'subscribers' | 'watchtime';
  value: number;
  zScore: number;
};
