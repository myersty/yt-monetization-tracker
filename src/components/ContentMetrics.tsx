'use client';

import { DailyMetrics } from '@/lib/types';

type ContentMetricsProps = {
  daily: DailyMetrics[];
  currentSubscribers: number;
  totalWatchTimeHours: number;
  videosLast90Days?: number;
  postingCadenceDays?: number;
};

const SUBSCRIBER_GOAL = 1000;
const WATCH_HOURS_GOAL = 4000;

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

  // Path to monetization calculations
  const subsNeeded = Math.max(SUBSCRIBER_GOAL - currentSubscribers, 0);
  const hoursNeeded = Math.max(WATCH_HOURS_GOAL - totalWatchTimeHours, 0);
  const isEligible = subsNeeded === 0 && hoursNeeded === 0;

  const subsProgress = Math.min(currentSubscribers / SUBSCRIBER_GOAL, 1);
  const hoursProgress = Math.min(totalWatchTimeHours / WATCH_HOURS_GOAL, 1);

  // Weeks at current pace
  const weeksForSubs = avgSubsPerWeek > 0 ? Math.ceil(subsNeeded / avgSubsPerWeek) : null;
  const weeksForHours = avgWatchHoursPerWeek > 0 ? Math.ceil(hoursNeeded / avgWatchHoursPerWeek) : null;
  const weeksToMonetization = weeksForSubs !== null && weeksForHours !== null
    ? Math.max(weeksForSubs, weeksForHours)
    : weeksForSubs ?? weeksForHours;

  // Estimated date
  const estimatedDate = weeksToMonetization !== null && weeksToMonetization > 0
    ? new Date(Date.now() + weeksToMonetization * 7 * 24 * 60 * 60 * 1000)
    : null;

  // How far above thresholds
  const subsMultiplier = currentSubscribers / SUBSCRIBER_GOAL;
  const hoursMultiplier = totalWatchTimeHours / WATCH_HOURS_GOAL;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Card 1: Content Performance */}
      <div className="card ring-base ring-tr p-6">
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
              ? `Need ${Math.round(WATCH_HOURS_GOAL / 52)} hrs/wk to hit 4K in a year`
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

      {/* Card 2: Path to Monetization */}
      <div className="card ring-base ring-tl p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-gradient mb-5">
          Path to Monetization
        </p>

        {isEligible ? (
          <div className="space-y-4">
            <div className="text-center py-2">
              <p className="text-xl font-bold font-[family-name:var(--font-display)] text-[#2E7D32]">
                You&apos;re Eligible!
              </p>
              <p className="text-sm text-[var(--gray-600)] mt-1">
                Apply for the YouTube Partner Program
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--gray-200)]">
              <div className="text-center">
                <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-accent-gradient">
                  {Math.round(subsMultiplier)}x
                </p>
                <p className="text-xs text-[var(--gray-500)] mt-1">
                  above subscriber threshold
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#1565C0]">
                  {Math.round(hoursMultiplier)}x
                </p>
                <p className="text-xs text-[var(--gray-500)] mt-1">
                  above watch hour threshold
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Hero: Estimated timeline */}
            {weeksToMonetization !== null && weeksToMonetization > 0 && (
              <div className="text-center py-3 px-4 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)]">
                <p className="text-4xl font-bold font-[family-name:var(--font-display)] text-accent-gradient">
                  ~{weeksToMonetization} weeks
                </p>
                {estimatedDate && (
                  <p className="text-sm text-[var(--gray-600)] mt-1">
                    Target: {estimatedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {/* Progress bars */}
            <div className="space-y-3">
              <ProgressRow
                label="Subscribers"
                current={currentSubscribers}
                goal={SUBSCRIBER_GOAL}
                progress={subsProgress}
                color="var(--gold)"
              />
              <ProgressRow
                label="Watch Hours"
                current={Math.round(totalWatchTimeHours)}
                goal={WATCH_HOURS_GOAL}
                progress={hoursProgress}
                color="#1565C0"
              />
            </div>

            {/* What's left */}
            <div className="flex gap-3 text-xs text-[var(--gray-500)]">
              {subsNeeded > 0 && (
                <span className="flex-1 text-center py-2 rounded-lg bg-[var(--gray-50)]">
                  {subsNeeded.toLocaleString()} subs to go
                </span>
              )}
              {hoursNeeded > 0 && (
                <span className="flex-1 text-center py-2 rounded-lg bg-[var(--gray-50)]">
                  {Math.round(hoursNeeded).toLocaleString()} hours to go
                </span>
              )}
            </div>

            {/* Achieved thresholds */}
            {subsNeeded === 0 && (
              <div className="flex items-center gap-2 text-sm text-[#2E7D32] bg-[#2E7D32]/10 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Subscriber threshold met!
              </div>
            )}
            {hoursNeeded === 0 && (
              <div className="flex items-center gap-2 text-sm text-[#2E7D32] bg-[#2E7D32]/10 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Watch hours threshold met!
              </div>
            )}
          </div>
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

function ProgressRow({
  label,
  current,
  goal,
  progress,
  color,
}: {
  label: string;
  current: number;
  goal: number;
  progress: number;
  color: string;
}) {
  const pct = Math.round(progress * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-[var(--gray-700)]">{label}</span>
        <span className="text-xs text-[var(--gray-500)]">
          <span className="font-semibold text-[var(--foreground)]">{current.toLocaleString()}</span>
          {' / '}
          {goal.toLocaleString()}
          <span className="ml-1.5 text-[var(--gray-400)]">({pct}%)</span>
        </span>
      </div>
      <div className="w-full h-[3px] rounded-full bg-[var(--gray-200)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-in-out"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  );
}
