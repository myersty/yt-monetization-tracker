'use client';

import { DailyMetrics } from '@/lib/types';

type ContentMetricsProps = {
  daily: DailyMetrics[];
  currentSubscribers: number;
  totalWatchTimeHours: number;
};

const SUBSCRIBER_GOAL = 1000;
const WATCH_HOURS_GOAL = 4000;

export default function ContentMetrics({
  daily,
  currentSubscribers,
  totalWatchTimeHours,
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

  // Path to monetization calculations
  const subsNeeded = Math.max(SUBSCRIBER_GOAL - currentSubscribers, 0);
  const hoursNeeded = Math.max(WATCH_HOURS_GOAL - totalWatchTimeHours, 0);
  const isEligible = subsNeeded === 0 && hoursNeeded === 0;

  // Weeks at current pace (based on 90-day averages)
  const weeksForSubs = avgSubsPerWeek > 0 ? Math.ceil(subsNeeded / avgSubsPerWeek) : null;
  const weeksForHours = avgWatchHoursPerWeek > 0 ? Math.ceil(hoursNeeded / avgWatchHoursPerWeek) : null;
  const weeksToMonetization = weeksForSubs !== null && weeksForHours !== null
    ? Math.max(weeksForSubs, weeksForHours)
    : weeksForSubs ?? weeksForHours;

  // How far above thresholds
  const subsMultiplier = currentSubscribers / SUBSCRIBER_GOAL;
  const hoursMultiplier = totalWatchTimeHours / WATCH_HOURS_GOAL;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Card 1: Content Performance */}
      <div className="rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-6 shadow-[var(--card-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-4">
          Content Performance (Last 90 Days)
        </p>
        <div className="space-y-4">
          <MetricRow
            label="Avg Watch Hours / Week"
            value={avgWatchHoursPerWeek < 1 ? avgWatchHoursPerWeek.toFixed(2) : Math.round(avgWatchHoursPerWeek).toLocaleString()}
            sublabel={`${Math.round(totalWatchHours90).toLocaleString()} total hours`}
          />
          <MetricRow
            label="Avg Subscribers / Week"
            value={avgSubsPerWeek < 1 ? avgSubsPerWeek.toFixed(2) : Math.round(avgSubsPerWeek).toLocaleString()}
            sublabel={`${totalNetSubs90 >= 0 ? '+' : ''}${totalNetSubs90.toLocaleString()} net`}
            trend={avgSubsPerWeek > 0 ? 'up' : avgSubsPerWeek < 0 ? 'down' : 'neutral'}
          />
          <MetricRow
            label="Avg Views / Day"
            value={avgViewsPerDay < 1 ? avgViewsPerDay.toFixed(2) : Math.round(avgViewsPerDay).toLocaleString()}
            sublabel={`${totalViews90.toLocaleString()} total views`}
          />
        </div>
      </div>

      {/* Card 2: Path to Monetization */}
      <div className="rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-6 shadow-[var(--card-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-4">
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
                <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--gold)]">
                  {Math.round(subsMultiplier)}x
                </p>
                <p className="text-xs text-[var(--gray-600)] mt-1">
                  above subscriber threshold
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[#1565C0]">
                  {Math.round(hoursMultiplier)}x
                </p>
                <p className="text-xs text-[var(--gray-600)] mt-1">
                  above watch hour threshold
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {subsNeeded > 0 && (
              <PathItem
                icon="person"
                text={`${subsNeeded.toLocaleString()} more subscribers needed`}
                color="var(--gold)"
              />
            )}
            {hoursNeeded > 0 && (
              <PathItem
                icon="clock"
                text={`${Math.round(hoursNeeded).toLocaleString()} more watch hours needed`}
                color="#1565C0"
              />
            )}
            {weeksToMonetization !== null && weeksToMonetization > 0 && (
              <PathItem
                icon="calendar"
                text={`~${weeksToMonetization} week${weeksToMonetization !== 1 ? 's' : ''} at current pace`}
                color="var(--gray-600)"
              />
            )}
            {subsNeeded === 0 && (
              <PathItem
                icon="check"
                text="Subscriber threshold met!"
                color="#2E7D32"
              />
            )}
            {hoursNeeded === 0 && (
              <PathItem
                icon="check"
                text="Watch hours threshold met!"
                color="#2E7D32"
              />
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
}: {
  label: string;
  value: string;
  sublabel: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-[var(--gray-700)]">{label}</p>
        <p className="text-xs text-[var(--gray-500)]">{sublabel}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="font-[family-name:var(--font-display)] font-bold text-lg">
          {value}
        </p>
        {trend === 'up' && (
          <svg className="w-4 h-4 text-[#2E7D32]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l5-5 5 5M7 7l5-5 5 5" />
          </svg>
        )}
        {trend === 'down' && (
          <svg className="w-4 h-4 text-[#c0392b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-5 5-5-5M17 17l-5 5-5-5" />
          </svg>
        )}
      </div>
    </div>
  );
}

function PathItem({
  icon,
  text,
  color,
}: {
  icon: 'person' | 'clock' | 'calendar' | 'check';
  text: string;
  color: string;
}) {
  const icons = {
    person: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    clock: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    calendar: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    check: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--gray-50)]">
      <span style={{ color }} className="flex-shrink-0">{icons[icon]}</span>
      <p className="text-sm text-[var(--gray-700)]">{text}</p>
    </div>
  );
}
