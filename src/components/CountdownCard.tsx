'use client';

import { Projection } from '@/lib/types';
import { useCountUp } from '@/lib/useCountUp';

type CountdownCardProps = {
  projections: Projection[];
  currentSubscribers?: number;
  totalWatchHours?: number;
};

function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysFromNow(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getStageEmoji(progressPercent: number): { emoji: string; size: string } {
  if (progressPercent >= 100) return { emoji: '🎉', size: 'text-5xl' };
  if (progressPercent >= 75) return { emoji: '💪', size: 'text-2xl' };
  if (progressPercent >= 50) return { emoji: '⭐', size: 'text-2xl' };
  if (progressPercent >= 25) return { emoji: '🚀', size: 'text-2xl' };
  if (progressPercent >= 10) return { emoji: '🔥', size: 'text-2xl' };
  return { emoji: '🌱', size: 'text-2xl' };
}

function getMotivationalMessage(progressPercent: number, daysRemaining: number | null): string {
  if (progressPercent >= 100) return '';
  if (progressPercent >= 75) return 'You\'re in the home stretch. Keep pushing!';
  if (progressPercent >= 50) return 'Halfway there! Consistency is everything now.';
  if (daysRemaining !== null && daysRemaining < 180) return 'You\'re making real progress. Stay consistent and you\'ll get there.';
  if (progressPercent >= 25) return 'Great momentum building. Focus on content that drives watch time.';
  if (progressPercent >= 10) return 'You\'re off to a solid start. Post consistently and engage your audience.';
  return 'Every creator starts here. Focus on finding your niche and posting regularly.';
}

export default function CountdownCard({ projections, currentSubscribers = 0, totalWatchHours = 0 }: CountdownCardProps) {
  const current = projections.find(p => p.model === 'current');
  const conservative = projections.find(p => p.model === 'conservative');
  const optimistic = projections.find(p => p.model === 'optimistic');

  const primaryDate = current?.monetizationDate ?? null;
  const primaryDays = daysFromNow(primaryDate);

  const alreadyMonetizable =
    current?.subscriberProjection.alreadyAchieved &&
    current?.watchTimeProjection.alreadyAchieved;

  // Calculate overall progress percentage (average of both thresholds, capped at 100)
  const subProgress = Math.min(100, (currentSubscribers / 1000) * 100);
  const hoursProgress = Math.min(100, (totalWatchHours / 4000) * 100);
  const overallProgress = (subProgress + hoursProgress) / 2;
  const stage = getStageEmoji(alreadyMonetizable ? 100 : overallProgress);

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
            {primaryDays !== null && primaryDays > 0 && (
              <p className="text-accent-gradient font-semibold text-xl mt-2">
                <CountUpDays target={primaryDays} /> days away
              </p>
            )}
            <p className="text-[var(--gray-500)] text-xs mt-1">
              At your current pace
            </p>
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

function CountUpDays({ target }: { target: number }) {
  const value = useCountUp(target, 800, 300);
  return <>{value}</>;
}

function ProjectionEstimate({
  label,
  date,
  color,
  active = false,
}: {
  label: string;
  date: Date | null;
  color: string;
  active?: boolean;
}) {
  const days = daysFromNow(date);

  return (
    <div className={`text-center ${active ? 'opacity-100' : 'opacity-70'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${active ? 'text-accent-gradient' : ''}`} style={active ? undefined : { color }}>
        {label}
      </p>
      <p className={`text-sm font-bold font-[family-name:var(--font-display)] ${active ? 'text-[var(--foreground)]' : 'text-[var(--gray-700)]'}`}>
        {date ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
      </p>
      {days !== null && days > 0 && (
        <p className="text-xs text-[var(--gray-500)]">{days}d</p>
      )}
    </div>
  );
}
