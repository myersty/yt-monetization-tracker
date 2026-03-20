'use client';

import { Projection, DailyMetrics } from '@/lib/types';

type CountdownCardProps = {
  projections: Projection[];
  currentSubscribers?: number;
  totalWatchHours?: number;
  daily?: DailyMetrics[];
};

function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStageEmoji(progressPercent: number): { emoji: string; size: string } {
  if (progressPercent >= 100) return { emoji: '🎉', size: 'text-5xl' };
  if (progressPercent >= 75) return { emoji: '💪', size: 'text-2xl' };
  if (progressPercent >= 50) return { emoji: '⭐', size: 'text-2xl' };
  if (progressPercent >= 25) return { emoji: '🚀', size: 'text-2xl' };
  if (progressPercent >= 10) return { emoji: '🔥', size: 'text-2xl' };
  return { emoji: '🌱', size: 'text-2xl' };
}

export default function CountdownCard({ projections, currentSubscribers = 0, totalWatchHours = 0, daily = [] }: CountdownCardProps) {
  const current = projections.find(p => p.model === 'current');

  const primaryDate = current?.monetizationDate ?? null;

  const alreadyMonetizable =
    current?.subscriberProjection.alreadyAchieved &&
    current?.watchTimeProjection.alreadyAchieved;

  // Calculate overall progress percentage (average of both thresholds, capped at 100)
  const subProgress = Math.min(100, (currentSubscribers / 1000) * 100);
  const hoursProgress = Math.min(100, (totalWatchHours / 4000) * 100);
  const overallProgress = (subProgress + hoursProgress) / 2;
  const stage = getStageEmoji(alreadyMonetizable ? 100 : overallProgress);

  // Compute weeks to monetization from last 90 days pace
  const last90 = daily.slice(-90);
  const numWeeks = Math.max(last90.length / 7, 1);
  const avgSubsPerWeek = last90.reduce((s, d) => s + ((d.subscribersGained || 0) - Math.abs(d.subscribersLost || 0)), 0) / numWeeks;
  const avgHoursPerWeek = last90.reduce((s, d) => s + (d.watchTimeHours || 0), 0) / numWeeks;
  const subsNeeded = Math.max(1000 - currentSubscribers, 0);
  const hoursNeeded = Math.max(4000 - totalWatchHours, 0);
  const weeksForSubs = avgSubsPerWeek > 0 ? Math.ceil(subsNeeded / avgSubsPerWeek) : null;
  const weeksForHours = avgHoursPerWeek > 0 ? Math.ceil(hoursNeeded / avgHoursPerWeek) : null;
  const weeksToTarget = weeksForSubs !== null && weeksForHours !== null
    ? Math.max(weeksForSubs, weeksForHours)
    : weeksForSubs ?? weeksForHours;

  return (
    <div className="card ring-base ring-br p-6 min-h-[320px] flex flex-col">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent-gradient mb-3">
        Estimated Monetization Date
      </p>

      {alreadyMonetizable ? (
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-3">
            <span className={`${stage.size} leading-none`}>{stage.emoji}</span>
            <p className="text-3xl font-bold font-[family-name:var(--font-display)] text-[#2E7D32]">
              You&apos;re Eligible!
            </p>
            <span className={`${stage.size} leading-none`}>{stage.emoji}</span>
          </div>
          <p className="text-[var(--gray-600)] text-sm mt-2">
            You&apos;ve hit both thresholds. Apply for the YouTube Partner Program!
          </p>
        </div>
      ) : (
        <>
          {/* Primary projection */}
          <div className="text-center py-4">
            <span className={`${stage.size} leading-none`}>{stage.emoji}</span>
            <p className="text-heading-gradient text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] mt-2">
              {formatDate(primaryDate || null)}
            </p>
            {weeksToTarget !== null && weeksToTarget > 0 && (
              <p className="text-accent-gradient font-semibold text-xl mt-2">
                ~{weeksToTarget} weeks at your current pace
              </p>
            )}
          </div>
          <div className="mt-auto pt-4 border-t border-white/6">
            <p className="text-[var(--gray-500)] text-[11px] leading-relaxed">
              Calculated from your posting cadence, average views, and watch time retention.{' '}
              <a href="#recommendations" className="text-accent-gradient font-medium hover:underline">
                See your Channel Insights
              </a>{' '}
              for tips to shorten your timeline.
            </p>
          </div>
        </>
      )}
    </div>
  );
}


