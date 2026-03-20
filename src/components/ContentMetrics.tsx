'use client';

import { DailyMetrics } from '@/lib/types';

type ContentMetricsProps = {
  daily: DailyMetrics[];
  currentSubscribers: number;
  totalWatchTimeHours: number;
  videosLast90Days?: number;
  postingCadenceDays?: number;
};

export default function ContentMetrics({
  daily,
  currentSubscribers,
  totalWatchTimeHours,
  videosLast90Days,
  postingCadenceDays,
}: ContentMetricsProps) {
  // Last 90 days of data
  const last90 = daily.slice(-90);
  const numWeeks = Math.max(last90.length / 7, 1);

  const totalWatchHours90 = last90.reduce((sum, d) => sum + (d.watchTimeHours || 0), 0);
  const totalNetSubs90 = last90.reduce(
    (sum, d) => sum + ((d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0)),
    0
  );
  const totalViews90 = last90.reduce((sum, d) => sum + (d.views || 0), 0);

  const avgWatchHoursPerWeek = totalWatchHours90 / numWeeks;
  const avgSubsPerWeek = totalNetSubs90 / numWeeks;
  const avgViewsPerDay = totalViews90 / Math.max(last90.length, 1);

  // Compare to previous 90 days for trend
  const prev90 = daily.slice(-180, -90);
  const prevNumWeeks = Math.max(prev90.length / 7, 1);
  const prevSubsPerWeek = prev90.length > 0
    ? prev90.reduce((sum, d) => sum + ((d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0)), 0) / prevNumWeeks
    : 0;
  const prevWatchHoursPerWeek = prev90.length > 0
    ? prev90.reduce((sum, d) => sum + (d.watchTimeHours || 0), 0) / prevNumWeeks
    : 0;

  const subsTrend = prevSubsPerWeek > 0
    ? Math.round(((avgSubsPerWeek - prevSubsPerWeek) / prevSubsPerWeek) * 100)
    : null;
  const hoursTrend = prevWatchHoursPerWeek > 0
    ? Math.round(((avgWatchHoursPerWeek - prevWatchHoursPerWeek) / prevWatchHoursPerWeek) * 100)
    : null;

  const subsNeeded = Math.max(1000 - currentSubscribers, 0);
  const weeksForSubs = avgSubsPerWeek > 0 ? Math.ceil(subsNeeded / avgSubsPerWeek) : null;

  return (
    <div className="card p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent-gradient mb-5">
        Content Performance (Last 90 Days)
      </p>
      <div className="space-y-4">
        <MetricRow
          label="Watch Hours / Week"
          value={avgWatchHoursPerWeek < 1 ? avgWatchHoursPerWeek.toFixed(2) : Math.round(avgWatchHoursPerWeek).toLocaleString()}
          sublabel={`${Math.round(totalWatchHours90).toLocaleString()} total hours`}
          trend={hoursTrend}
          context={avgWatchHoursPerWeek > 0
            ? `Need ${Math.round(4000 / 52)} hrs/wk to hit 4K in a year`
            : undefined}
        />
        <MetricRow
          label="Subscribers / Week"
          value={avgSubsPerWeek < 1 ? avgSubsPerWeek.toFixed(2) : Math.round(avgSubsPerWeek).toLocaleString()}
          sublabel={`${totalNetSubs90 >= 0 ? '+' : ''}${totalNetSubs90.toLocaleString()} net`}
          trend={subsTrend}
          context={weeksForSubs !== null && weeksForSubs > 0
            ? `At this pace → 1K subs in ~${weeksForSubs} weeks`
            : subsNeeded === 0 ? '✓ Subscriber goal reached' : undefined}
        />
        <MetricRow
          label="Views / Day"
          value={avgViewsPerDay < 1 ? avgViewsPerDay.toFixed(2) : Math.round(avgViewsPerDay).toLocaleString()}
          sublabel={`${totalViews90.toLocaleString()} total views`}
        />
        {postingCadenceDays !== undefined && (
          <MetricRow
            label="Posting Cadence"
            value={`Every ${postingCadenceDays.toFixed(1)} days`}
            sublabel={`${videosLast90Days ?? 0} videos in last 90 days`}
          />
        )}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  sublabel,
  trend,
  context,
}: {
  label: string;
  value: string;
  sublabel: string;
  trend?: number | null;
  context?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--gray-700)]">{label}</p>
          <p className="text-xs text-[var(--gray-500)]">{sublabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-[family-name:var(--font-display)] font-bold text-lg">
            {value}
          </p>
          {trend !== null && trend !== undefined && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              trend > 0
                ? 'text-[#2E7D32] bg-[#2E7D32]/10'
                : trend < 0
                  ? 'text-[#c0392b] bg-[#c0392b]/10'
                  : 'text-[var(--gray-500)] bg-[var(--gray-100)]'
            }`}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
      {context && (
        <p className="text-xs text-[var(--gray-400)] mt-1 italic">{context}</p>
      )}
    </div>
  );
}

