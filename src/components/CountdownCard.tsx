'use client';

import { Projection, DailyMetrics } from '@/lib/types';

type WhatIfRates = {
  dailyNewSubs: number;
  dailyWatchHours: number;
};

type CountdownCardProps = {
  projections: Projection[];
  currentSubscribers?: number;
  totalWatchHours?: number;
  daily?: DailyMetrics[];
  whatIfRates?: WhatIfRates;
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

export default function CountdownCard({ projections, currentSubscribers = 0, totalWatchHours = 0, daily = [], whatIfRates }: CountdownCardProps) {
  const current = projections.find(p => p.model === 'current');

  const alreadyMonetizable =
    current?.subscriberProjection.alreadyAchieved &&
    current?.watchTimeProjection.alreadyAchieved;

  // Calculate overall progress percentage (average of both thresholds, capped at 100)
  const subProgress = Math.min(100, (currentSubscribers / 1000) * 100);
  const hoursProgress = Math.min(100, (totalWatchHours / 4000) * 100);
  const overallProgress = (subProgress + hoursProgress) / 2;
  const stage = getStageEmoji(alreadyMonetizable ? 100 : overallProgress);

  const subsNeeded = Math.max(1000 - currentSubscribers, 0);
  const hoursNeeded = Math.max(4000 - totalWatchHours, 0);

  // When What-If sliders are adjusted, compute from those rates
  // Otherwise use the acceleration-aware curved projection from the current model
  let weeksToTarget: number | null = null;
  let estimatedDate: Date | null = null;
  const isWhatIf = !!whatIfRates;

  if (whatIfRates) {
    const daysForSubs = whatIfRates.dailyNewSubs > 0 ? Math.ceil(subsNeeded / whatIfRates.dailyNewSubs) : null;
    const daysForHours = whatIfRates.dailyWatchHours > 0 ? Math.ceil(hoursNeeded / whatIfRates.dailyWatchHours) : null;
    let daysToTarget: number | null = null;
    if (daysForSubs !== null && daysForHours !== null) {
      daysToTarget = Math.max(daysForSubs, daysForHours);
    } else {
      daysToTarget = daysForSubs ?? daysForHours;
    }
    if (daysToTarget !== null && daysToTarget > 0) {
      weeksToTarget = Math.ceil(daysToTarget / 7);
      estimatedDate = new Date(Date.now() + daysToTarget * 24 * 60 * 60 * 1000);
    }
  } else {
    // Use acceleration-aware curved projection date
    estimatedDate = current?.monetizationDate ?? null;
    // Derive weeks from the longer of the two metric timelines
    const subDays = current?.subscriberProjection.daysRemaining;
    const hourDays = current?.watchTimeProjection.daysRemaining;
    const longerDays = subDays != null && hourDays != null
      ? Math.max(subDays, hourDays)
      : subDays ?? hourDays;
    weeksToTarget = longerDays != null ? Math.ceil(longerDays / 7) : null;
  }

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
              {formatDate(estimatedDate)}
            </p>
            {weeksToTarget !== null && weeksToTarget > 0 && (
              <p className="text-accent-gradient font-semibold text-xl mt-2">
                ~{weeksToTarget} weeks {isWhatIf ? 'with this schedule' : 'at your current pace'}
              </p>
            )}
          </div>
          <div className="mt-auto pt-4 border-t border-white/6">
            <p className="text-[var(--gray-500)] text-[11px] leading-relaxed">
              {isWhatIf ? (
                <>Adjust the What-If sliders below to explore different scenarios.</>
              ) : (
                <>
                  Calculated from your posting cadence, average views, and watch time retention.{' '}
                  <a href="#recommendations" className="text-accent-gradient font-medium hover:underline">
                    See your Channel Insights
                  </a>{' '}
                  for tips to shorten your timeline.
                </>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}


