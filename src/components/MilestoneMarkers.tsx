'use client';

type MilestoneMarkersProps = {
  currentSubscribers: number;
  totalWatchHours: number;
};

type Milestone = {
  label: string;
  threshold: number;
  metric: 'subscribers' | 'watchhours';
  icon: string;
};

const MILESTONES: Milestone[] = [
  { label: 'First 100 Subs', threshold: 100, metric: 'subscribers', icon: '🌱' },
  { label: '250 Subs', threshold: 250, metric: 'subscribers', icon: '🌿' },
  { label: '500 Subs', threshold: 500, metric: 'subscribers', icon: '🌳' },
  { label: '1,000 Subs', threshold: 1000, metric: 'subscribers', icon: '⭐' },
  { label: '1,000 Watch Hours', threshold: 1000, metric: 'watchhours', icon: '⏱️' },
  { label: '2,000 Watch Hours', threshold: 2000, metric: 'watchhours', icon: '⏰' },
  { label: '3,000 Watch Hours', threshold: 3000, metric: 'watchhours', icon: '🔥' },
  { label: '4,000 Watch Hours', threshold: 4000, metric: 'watchhours', icon: '🏆' },
];

export default function MilestoneMarkers({ currentSubscribers, totalWatchHours }: MilestoneMarkersProps) {
  const getValue = (metric: 'subscribers' | 'watchhours') =>
    metric === 'subscribers' ? currentSubscribers : totalWatchHours;

  // Find the next unachieved milestone
  const nextMilestoneIndex = MILESTONES.findIndex(
    m => getValue(m.metric) < m.threshold
  );

  return (
    <div className="rounded-[var(--card-radius)] border border-white/6 bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent-gradient mb-4">
        Milestones
      </p>

      <div className="space-y-3">
        {MILESTONES.map((milestone, i) => {
          const current = getValue(milestone.metric);
          const achieved = current >= milestone.threshold;
          const isNext = i === nextMilestoneIndex;
          const progress = Math.min(current / milestone.threshold, 1);

          return (
            <div
              key={i}
              className={`
                flex items-center gap-3 p-3 rounded-lg transition-all duration-200
                ${isNext
                  ? 'bg-[var(--gold)]/5 border border-[var(--gold)]/20'
                  : achieved
                    ? 'opacity-70'
                    : 'opacity-40'
                }
              `}
            >
              <span className="text-lg w-8 text-center">{milestone.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${achieved ? 'line-through text-[var(--gray-500)]' : ''}`}>
                  {milestone.label}
                </p>
                {!achieved && (
                  <div className="mt-1 h-1.5 bg-[var(--gray-200)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${progress * 100}%`,
                        backgroundColor: isNext ? 'var(--gold)' : 'var(--gray-400)',
                      }}
                    />
                  </div>
                )}
              </div>
              {achieved && (
                <svg className="w-5 h-5 text-[#2E7D32] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {isNext && !achieved && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-gradient bg-[var(--gold)]/10 px-2 py-0.5 rounded-full">
                  Next
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
