'use client';

import { Projection } from '@/lib/types';

type CountdownCardProps = {
  projections: Projection[];
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

export default function CountdownCard({ projections }: CountdownCardProps) {
  const current = projections.find(p => p.model === 'current');
  const conservative = projections.find(p => p.model === 'conservative');
  const optimistic = projections.find(p => p.model === 'optimistic');

  const primaryDate = current?.monetizationDate ?? null;
  const primaryDays = daysFromNow(primaryDate);

  const alreadyMonetizable =
    current?.subscriberProjection.alreadyAchieved &&
    current?.watchTimeProjection.alreadyAchieved;

  return (
    <div className="rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-6 shadow-[var(--card-shadow)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-3">
        Estimated Monetization Date
      </p>

      {alreadyMonetizable ? (
        <div className="text-center py-4">
          <p className="text-3xl font-bold font-[family-name:var(--font-display)] text-[#2E7D32]">
            You&apos;re Eligible!
          </p>
          <p className="text-[var(--gray-600)] text-sm mt-2">
            You&apos;ve hit both thresholds. Apply for the YouTube Partner Program!
          </p>
        </div>
      ) : (
        <>
          {/* Primary projection */}
          <div className="text-center mb-6">
            <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--foreground)]">
              {formatDate(primaryDate || null)}
            </p>
            {primaryDays !== null && primaryDays > 0 && (
              <p className="text-[var(--gold)] font-semibold text-lg mt-1">
                {primaryDays} days away
              </p>
            )}
            <p className="text-[var(--gray-500)] text-xs mt-1">
              At your current pace
            </p>
          </div>

          {/* All three estimates */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--gray-200)]">
            <ProjectionEstimate
              label="Conservative"
              date={conservative?.monetizationDate || null}
              color="var(--gray-600)"
            />
            <ProjectionEstimate
              label="Current Pace"
              date={current?.monetizationDate || null}
              color="var(--gold)"
              active
            />
            <ProjectionEstimate
              label="Optimistic"
              date={optimistic?.monetizationDate || null}
              color="#2E7D32"
            />
          </div>
        </>
      )}
    </div>
  );
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
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color }}>
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
