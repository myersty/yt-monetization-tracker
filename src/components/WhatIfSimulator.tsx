'use client';

import { useState, useMemo, useEffect } from 'react';
import { WhatIfRates } from './Dashboard';

type WhatIfSimulatorProps = {
  currentSubscribers: number;
  totalWatchHours: number;
  currentSubsPerDay: number;
  currentHoursPerDay: number;
  postingCadenceDays?: number;
  avgVideoDurationMinutes?: number;
  avgViewsPerVideo?: number;
  averageViewPercentage?: number;
  onRatesChange?: (rates: WhatIfRates) => void;
};

export default function WhatIfSimulator({
  currentSubscribers,
  totalWatchHours,
  currentSubsPerDay,
  currentHoursPerDay,
  postingCadenceDays,
  avgVideoDurationMinutes,
  avgViewsPerVideo: actualAvgViews,
  averageViewPercentage,
  onRatesChange,
}: WhatIfSimulatorProps) {
  const actualCadence = postingCadenceDays ?? 7;
  const actualDuration = avgVideoDurationMinutes ?? 10;
  const actualViews = actualAvgViews ?? 500;
  // Use real retention from YouTube Analytics, or calculate from data, or fall back to 40%
  const retentionRate = averageViewPercentage ? averageViewPercentage / 100 : 0.4;

  const [daysBetweenPosts, setDaysBetweenPosts] = useState(Math.round(actualCadence));
  const [avgVideoMinutes, setAvgVideoMinutes] = useState(Math.round(actualDuration));
  const [avgViewsPerVideo, setAvgViewsPerVideo] = useState(actualViews);

  // Update defaults when real data arrives
  useEffect(() => {
    if (avgVideoDurationMinutes) setAvgVideoMinutes(Math.round(avgVideoDurationMinutes));
  }, [avgVideoDurationMinutes]);

  useEffect(() => {
    if (actualAvgViews) setAvgViewsPerVideo(actualAvgViews);
  }, [actualAvgViews]);

  const projection = useMemo(() => {
    // Convert days between posts to videos per week
    const videosPerWeek = 7 / daysBetweenPosts;

    // Use real retention rate from YouTube Analytics
    const avgWatchMinutesPerView = avgVideoMinutes * retentionRate;
    const weeklyWatchHours = (videosPerWeek * avgViewsPerVideo * avgWatchMinutesPerView) / 60;
    const dailyWatchHours = weeklyWatchHours / 7;

    // Subscriber conversion: ~2-5% of viewers subscribe (for small channels)
    const weeklyNewSubs = videosPerWeek * avgViewsPerVideo * 0.03;
    const dailyNewSubs = weeklyNewSubs / 7;

    const subsNeeded = Math.max(0, 1000 - currentSubscribers);
    const hoursNeeded = Math.max(0, 4000 - totalWatchHours);

    const daysForSubs = dailyNewSubs > 0 ? Math.ceil(subsNeeded / dailyNewSubs) : null;
    const daysForHours = dailyWatchHours > 0 ? Math.ceil(hoursNeeded / dailyWatchHours) : null;

    let daysToMonetization: number | null = null;
    if (daysForSubs !== null && daysForHours !== null) {
      daysToMonetization = Math.max(daysForSubs, daysForHours);
    } else {
      daysToMonetization = daysForSubs || daysForHours;
    }

    const estimatedDate = daysToMonetization !== null
      ? new Date(Date.now() + daysToMonetization * 24 * 60 * 60 * 1000)
      : null;

    return {
      dailyWatchHours,
      dailyNewSubs,
      daysToMonetization,
      estimatedDate,
      weeklyWatchHours,
      weeklyNewSubs,
    };
  }, [daysBetweenPosts, avgVideoMinutes, avgViewsPerVideo, retentionRate, currentSubscribers, totalWatchHours]);

  // Report rates to parent for timeline integration
  useEffect(() => {
    if (onRatesChange) {
      onRatesChange({
        dailyNewSubs: projection.dailyNewSubs,
        dailyWatchHours: projection.dailyWatchHours,
      });
    }
  }, [projection.dailyNewSubs, projection.dailyWatchHours, onRatesChange]);

  return (
    <div className="rounded-[var(--card-radius)] border border-white/6 bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)]">
          What-If Simulator
        </p>
        <button
          onClick={() => {
            setDaysBetweenPosts(Math.round(actualCadence));
            setAvgVideoMinutes(Math.round(actualDuration));
            setAvgViewsPerVideo(actualViews);
          }}
          className="text-xs text-[var(--gray-500)] hover:text-[var(--gold)] transition-colors flex items-center gap-1"
          title="Reset sliders to defaults"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Reset
        </button>
      </div>
      <p className="text-[var(--gray-500)] text-sm mb-6">
        Adjust the sliders to see how your posting schedule affects your timeline.
      </p>

      <div className="space-y-5">
        {/* Days between posts */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium">
              What if you posted every {daysBetweenPosts} day{daysBetweenPosts !== 1 ? 's' : ''}?
            </label>
            <span className="text-sm font-bold font-[family-name:var(--font-display)] text-[var(--gold)]">
              {daysBetweenPosts}d
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={daysBetweenPosts}
            onChange={e => setDaysBetweenPosts(Number(e.target.value))}
            className="w-full accent-[var(--gold)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--gray-500)]">
            <span>1 day</span>
            <span>30 days</span>
          </div>
          {postingCadenceDays !== undefined && (
            <p className="text-[10px] text-[var(--gray-500)] mt-1">
              You currently post every {postingCadenceDays.toFixed(1)} days
            </p>
          )}
        </div>

        {/* Avg video length */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium">Avg video length (min)</label>
            <span className="text-sm font-bold font-[family-name:var(--font-display)] text-[var(--gold)]">
              {avgVideoMinutes}
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={60}
            value={avgVideoMinutes}
            onChange={e => setAvgVideoMinutes(Number(e.target.value))}
            className="w-full accent-[var(--gold)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--gray-500)]">
            <span>3 min</span>
            <span>60 min</span>
          </div>
          {avgVideoDurationMinutes !== undefined && (
            <p className="text-[10px] text-[var(--gray-500)] mt-1">
              Your videos average {avgVideoDurationMinutes.toFixed(1)} min
            </p>
          )}
        </div>

        {/* Avg views per video */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium">Avg views per video</label>
            <span className="text-sm font-bold font-[family-name:var(--font-display)] text-[var(--gold)]">
              {avgViewsPerVideo.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={10000}
            step={50}
            value={avgViewsPerVideo}
            onChange={e => setAvgViewsPerVideo(Number(e.target.value))}
            className="w-full accent-[var(--gold)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--gray-500)]">
            <span>50</span>
            <span>10,000</span>
          </div>
          {actualAvgViews !== undefined && (
            <p className="text-[10px] text-[var(--gray-500)] mt-1">
              Your videos average {actualAvgViews.toLocaleString()} views
            </p>
          )}
        </div>
      </div>

      {/* Retention info badge */}
      {averageViewPercentage !== undefined && (
        <div className="mt-4 px-3 py-2 rounded-lg bg-[var(--gray-50)] border border-white/4">
          <p className="text-[10px] text-[var(--gray-500)]">
            Using your real average view percentage: <span className="text-[var(--gold)] font-semibold">{averageViewPercentage.toFixed(1)}%</span>
          </p>
        </div>
      )}

      {/* Result */}
      <div className="mt-6 pt-5 border-t border-[var(--gray-200)]">
        {projection.daysToMonetization !== null && projection.daysToMonetization > 0 ? (
          <div className="text-center">
            <p className="text-sm text-[var(--gray-600)] mb-1">With this schedule, you&apos;d hit monetization by</p>
            <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--foreground)]">
              {projection.estimatedDate?.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="text-accent-gradient font-semibold mt-1">
              ~{projection.daysToMonetization} days
            </p>
            <div className="flex justify-center gap-6 mt-3 text-xs text-[var(--gray-500)]">
              <span>~{Math.round(projection.weeklyNewSubs)} subs/week</span>
              <span>~{projection.weeklyWatchHours.toFixed(1)} hrs/week</span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-bold font-[family-name:var(--font-display)] text-[#2E7D32]">
              You&apos;re already there!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
