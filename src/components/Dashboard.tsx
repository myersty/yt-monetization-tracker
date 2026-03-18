'use client';

import { useMemo, useState } from 'react';
import { ParsedData } from '@/lib/types';
import { calculateProjections, generateProjectionPoints, detectOutliers } from '@/lib/projections';
import ProgressRings from './ProgressRings';
import TimelineChart from './TimelineChart';
import CountdownCard from './CountdownCard';
import VelocityCard from './VelocitySparkline';
import MilestoneMarkers from './MilestoneMarkers';
import WhatIfSimulator from './WhatIfSimulator';
import ContentMetrics from './ContentMetrics';

type DashboardProps = {
  data: ParsedData;
  onReset: () => void;
  isOAuthDashboard?: boolean;
};

export type WhatIfRates = {
  dailyNewSubs: number;
  dailyWatchHours: number;
} | null;

export default function Dashboard({ data, onReset, isOAuthDashboard = false }: DashboardProps) {
  const projections = useMemo(() => calculateProjections(data.daily), [data.daily]);
  const outliers = useMemo(() => detectOutliers(data.daily), [data.daily]);
  const [whatIfRates, setWhatIfRates] = useState<WhatIfRates>(null);
  const chartData = useMemo(
    () => generateProjectionPoints(data.daily, projections, 365, whatIfRates),
    [data.daily, projections, whatIfRates]
  );

  const currentProjection = projections.find(p => p.model === 'current');
  const currentSubsPerDay = currentProjection?.subscriberProjection.dailyRate || 0;
  const currentHoursPerDay = currentProjection?.watchTimeProjection.dailyRate || 0;

  // Summary stats
  const hasSubData = data.daily.some(d => d.subscribersGained !== undefined || d.subscribers !== undefined);
  const hasWatchData = data.daily.some(d => d.watchTimeHours !== undefined);
  const hasViewData = data.daily.some(d => d.views !== undefined);

  // Shorts breakdown
  const shortsBreakdown = data.shortsBreakdown;

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Header (hidden for OAuth dashboard since the channel header bar is shown instead) */}
      {!isOAuthDashboard && (
        <header className="bg-[var(--foreground)] text-[var(--background)] py-4 px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-display)] font-bold text-lg">
                Monetization Tracker
              </h1>
              <p className="text-xs text-[var(--gray-500)]">
                {data.dateRange.start} to {data.dateRange.end} &middot; {data.daily.length} days
              </p>
            </div>
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm rounded-full border border-[var(--gray-400)] text-[var(--gray-400)] hover:text-[var(--background)] hover:border-[var(--background)] transition-colors"
            >
              Upload New Data
            </button>
          </div>
        </header>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Data availability notice */}
        {(!hasSubData || !hasWatchData) && (
          <div className="mb-6 p-4 rounded-[var(--card-radius)] bg-[var(--gold)]/5 border border-[var(--gold)]/20">
            <p className="text-sm text-[var(--gray-700)]">
              <span className="font-semibold text-[var(--gold)]">Tip:</span> For the most accurate projections, export
              {!hasSubData && ' Subscribers'}
              {!hasSubData && !hasWatchData && ' and'}
              {!hasWatchData && ' Watch Time'}
              {' '}data from YouTube Studio&apos;s Advanced Mode.
              {hasViewData && ' Currently showing projections based on available view data.'}
            </p>
          </div>
        )}

        {/* Shorts info badge */}
        {shortsBreakdown && shortsBreakdown.shortsWatchTimeHours > 0 && (
          <div className="mb-6 p-3 rounded-[var(--card-radius)] bg-[#1565C0]/5 border border-[#1565C0]/20 animate-fade-in-up">
            <p className="text-sm text-[var(--gray-700)] flex items-center gap-2">
              <svg className="w-4 h-4 text-[#1565C0] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Watch hours shown are <strong>long-form only</strong>.{' '}
                {Math.round(shortsBreakdown.shortsWatchTimeHours).toLocaleString()} hours from Shorts excluded.
              </span>
            </p>
          </div>
        )}

        {/* Progress Rings */}
        <div className="mb-8 animate-fade-in-up">
          <ProgressRings
            currentSubscribers={data.totals.currentSubscribers}
            totalWatchHours={data.totals.totalWatchTimeHours}
          />
        </div>

        {/* Countdown + Velocity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="animate-fade-in-up-delay-1">
            <CountdownCard
              projections={projections}
              currentSubscribers={data.totals.currentSubscribers}
              totalWatchHours={data.totals.totalWatchTimeHours}
            />
          </div>
          <div className="animate-fade-in-up-delay-2">
            <VelocityCard
              daily={data.daily}
              availableMetrics={[
                ...(hasSubData ? ['subscribers' as const] : []),
                ...(hasWatchData ? ['watchtime' as const] : []),
                ...(hasViewData ? ['views' as const] : []),
              ]}
            />
          </div>
        </div>

        {/* Content Metrics + Path to Monetization */}
        <div className="mb-8 animate-fade-in-up-delay-3">
          <ContentMetrics
            daily={data.daily}
            currentSubscribers={data.totals.currentSubscribers}
            totalWatchTimeHours={data.totals.totalWatchTimeHours}
            videosLast90Days={data.videosLast90Days}
            postingCadenceDays={data.postingCadenceDays}
          />
        </div>

        {/* Timeline Chart */}
        {chartData.length > 0 && (
          <div className="mb-8 animate-fade-in-up-delay-4">
            <TimelineChart
              data={chartData}
              daily={data.daily}
              lastHistoricalDate={data.dateRange.end}
              currentSubscribers={data.totals.currentSubscribers}
            />
          </div>
        )}

        {/* Bottom Row: Milestones + What-If */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MilestoneMarkers
            currentSubscribers={data.totals.currentSubscribers}
            totalWatchHours={data.totals.totalWatchTimeHours}
          />
          <WhatIfSimulator
            currentSubscribers={data.totals.currentSubscribers}
            totalWatchHours={data.totals.totalWatchTimeHours}
            currentSubsPerDay={currentSubsPerDay}
            currentHoursPerDay={currentHoursPerDay}
            postingCadenceDays={data.postingCadenceDays}
            onRatesChange={setWhatIfRates}
          />
        </div>

        {/* Outlier Alerts */}
        {outliers.length > 0 && (
          <div className="mb-8 rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-6 shadow-[var(--card-shadow)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-3">
              Viral Spike Detection
            </p>
            <p className="text-sm text-[var(--gray-600)] mb-4">
              These days had unusually high activity (&gt;3 standard deviations). Projections account for these as outliers.
            </p>
            <div className="space-y-2">
              {outliers.slice(0, 5).map((o, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-[var(--gold)]" />
                  <span className="text-[var(--gray-700)]">
                    {new Date(o.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-[var(--gray-500)]">
                    {o.metric === 'subscribers' ? 'Subscribers' : 'Watch Hours'}: {Math.round(o.value).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[var(--gold)] font-semibold">
                    {o.zScore.toFixed(1)}x normal
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channel Overview */}
        <div className="rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-6 shadow-[var(--card-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-4">
            Channel Overview
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBlock label="Tracking Period" value={`${data.daily.length} days`} />
            <StatBlock label="Total Views" value={data.totals.totalViews.toLocaleString()} />
            <StatBlock label="Subscribers" value={data.totals.currentSubscribers.toLocaleString()} />
            <StatBlock
              label={shortsBreakdown ? 'Watch Hours (Long-Form)' : 'Watch Hours'}
              value={Math.round(data.totals.totalWatchTimeHours).toLocaleString()}
            />
          </div>
          {shortsBreakdown && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatBlock label="Shorts Watch Hours" value={Math.round(shortsBreakdown.shortsWatchTimeHours).toLocaleString()} />
              <StatBlock label="Total Watch Hours (All)" value={Math.round(shortsBreakdown.totalWatchTimeHours).toLocaleString()} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-[var(--gray-200)] text-center mt-8">
        <p className="text-xs text-[var(--gray-500)]">
          Built by Ty Myers Media LLC
          {!isOAuthDashboard && <> &middot; Your data never leaves your browser</>}
          {isOAuthDashboard && <> &middot; Connected securely via YouTube</>}
        </p>
      </footer>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-1">{label}</p>
      <p className="font-[family-name:var(--font-display)] font-bold text-xl">{value}</p>
    </div>
  );
}
