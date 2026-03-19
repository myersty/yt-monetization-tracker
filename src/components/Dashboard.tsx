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
import RecommendationsCard from './RecommendationsCard';

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
  const currentProjection = projections.find(p => p.model === 'current');
  const currentSubsPerDay = currentProjection?.subscriberProjection.dailyRate || 0;
  const currentHoursPerDay = currentProjection?.watchTimeProjection.dailyRate || 0;

  // What-If defaults to current pace so both lines overlap until sliders are moved
  const [whatIfRates, setWhatIfRates] = useState<WhatIfRates>(null);
  const effectiveWhatIfRates = whatIfRates ?? {
    dailyNewSubs: currentSubsPerDay,
    dailyWatchHours: currentHoursPerDay,
  };

  const chartData = useMemo(
    () => generateProjectionPoints(data.daily, projections, 365, effectiveWhatIfRates),
    [data.daily, projections, effectiveWhatIfRates]
  );

  // Summary stats
  const hasSubData = data.daily.some(d => d.subscribersGained !== undefined || d.subscribers !== undefined);
  const hasWatchData = data.daily.some(d => d.watchTimeHours !== undefined);
  const hasViewData = data.daily.some(d => d.views !== undefined);

  // Shorts breakdown
  const shortsBreakdown = data.shortsBreakdown;

  return (
    <div className="min-h-screen bg-[var(--gray-50)] relative">
      {/* Ambient background effects */}
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />
      <div className="ambient-bg">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="ambient-dot"
            style={{
              left: `${10 + (i * 7.5) % 85}%`,
              top: `${5 + (i * 13) % 90}%`,
              animationDelay: `${i * 1.1}s`,
              animationDuration: `${10 + (i % 4) * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Minimal header for CSV mode */}
      {!isOAuthDashboard && (
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            {data.channelName ? (
              <div className="flex items-center gap-3">
                {data.channelThumbnail && (
                  <img src={data.channelThumbnail} alt={data.channelName} className="w-9 h-9 rounded-full border border-white/10" />
                )}
                <p className="text-sm font-medium text-[var(--gray-600)]">{data.channelName}</p>
              </div>
            ) : (
              <p className="text-xs text-[var(--gray-500)]">
                {data.dateRange.start} to {data.dateRange.end} &middot; {data.daily.length} days
              </p>
            )}
            <button
              onClick={onReset}
              className="text-xs text-[var(--gray-500)] hover:text-[var(--gold)] transition-colors"
            >
              Upload New Data
            </button>
          </div>
        </div>
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

        {/* Progress Rings */}
        <div className="mb-14 animate-fade-in-up">
          <ProgressRings
            currentSubscribers={data.totals.currentSubscribers}
            totalWatchHours={data.totals.totalWatchTimeHours}
          />
        </div>

        {/* Countdown + Velocity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-14">
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

        {/* Section divider */}
        <div className="section-divider mb-14" />

        {/* Content Metrics + Path to Monetization */}
        <div className="mb-14 animate-fade-in-up-delay-3">
          <ContentMetrics
            daily={data.daily}
            currentSubscribers={data.totals.currentSubscribers}
            totalWatchTimeHours={data.totals.totalWatchTimeHours}
            videosLast90Days={data.videosLast90Days}
            postingCadenceDays={data.postingCadenceDays}
          />
        </div>

        {/* Section divider */}
        <div className="section-divider mb-14" />

        {/* Timeline Chart */}
        {chartData.length > 0 && (
          <div className="mb-14 animate-fade-in-up-delay-4">
            <TimelineChart
              data={chartData}
              daily={data.daily}
              lastHistoricalDate={data.dateRange.end}
              currentSubscribers={data.totals.currentSubscribers}
              totalWatchTimeHours={data.totals.totalWatchTimeHours}
              whatIfRates={effectiveWhatIfRates}
            />
          </div>
        )}

        {/* Bottom Row: Milestones + What-If */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-14">
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
            avgVideoDurationMinutes={data.avgVideoDurationMinutes}
            avgViewsPerVideo={data.avgViewsPerVideo}
            averageViewPercentage={data.averageViewPercentage}
            onRatesChange={setWhatIfRates}
          />
        </div>

        {/* Outlier Alerts */}
        {outliers.length > 0 && (
          <div className="card p-6 mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-gradient mb-3">
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
        <div className="card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-gradient mb-4">
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

        {/* Personalized Recommendations */}
        <RecommendationsCard
          avgVideoDurationMinutes={data.avgVideoDurationMinutes}
          avgViewsPerVideo={data.avgViewsPerVideo}
          averageViewPercentage={data.averageViewPercentage}
          postingCadenceDays={data.postingCadenceDays}
          currentSubscribers={data.totals.currentSubscribers}
          totalWatchHours={data.totals.totalWatchTimeHours}
          avgWatchHoursPerVideo={data.avgWatchHoursPerVideo}
          videosLast90Days={data.videosLast90Days}
        />

        {/* How It Works / FAQ Section */}
        <div className="card p-6 mb-14">
          <h3 className="text-heading-gradient font-[family-name:var(--font-display)] font-medium text-xl mb-6">
            How Your Data Is Calculated
          </h3>
          <div className="space-y-5 text-sm text-[var(--gray-600)]">
            <div>
              <p className="font-semibold text-[var(--gray-700)] mb-1">Watch Hours</p>
              <p>
                Only <strong>long-form video</strong> watch hours count toward the 4,000-hour YouTube Partner Program requirement.
                {shortsBreakdown && shortsBreakdown.shortsWatchTimeHours > 0 && (
                  <> We detected <strong>{Math.round(shortsBreakdown.shortsWatchTimeHours).toLocaleString()} hours</strong> from Shorts, which have been excluded from your total.</>
                )}
                {' '}YouTube evaluates watch hours on a <strong>rolling 365-day window</strong> &mdash; hours earned more than a year ago no longer count.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[var(--gray-700)] mb-1">Subscribers</p>
              <p>
                Your subscriber count is cumulative &mdash; once you reach 1,000, you stay qualified (unless you lose subscribers below the threshold). Subscribers gained from Shorts <strong>do count</strong> toward the requirement.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[var(--gray-700)] mb-1">Projections</p>
              <p>
                The &ldquo;Current Pace&rdquo; projection uses a weighted moving average of your last 30&ndash;90 days of growth. The &ldquo;What-If&rdquo; line uses your actual average view percentage ({data.averageViewPercentage ? `${data.averageViewPercentage.toFixed(0)}%` : 'estimated'}) to calculate how changes to your posting schedule would affect your trajectory.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[var(--gray-700)] mb-1">Average View Percentage</p>
              <p>
                This measures how much of each video your audience watches on average. It&rsquo;s calculated from your total watch hours divided by your total views and average video length. A higher percentage means your content holds attention longer, which drives more watch hours per view.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="cta-banner mb-14">
          <h2 className="text-heading-gradient font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-medium mb-3">
            Scale Your YouTube Channel Faster
          </h2>
          <p className="text-[var(--gray-500)] text-sm max-w-md mx-auto mb-6">
            Get personalized coaching to grow past 1,000 subscribers and build real momentum on YouTube.
          </p>
          <a
            href="https://momentum-builder.tymyersmedia.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gradient inline-flex items-center gap-2 px-8 py-3 text-sm"
          >
            Learn More
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-white/6 text-center mt-8">
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
