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
  onAdjustedChange?: (adjusted: boolean) => void;
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
  onAdjustedChange,
}: WhatIfSimulatorProps) {
  const actualCadence = postingCadenceDays ?? 7;
  const actualDuration = avgVideoDurationMinutes ?? 10;
  const actualViews = actualAvgViews ?? 500;
  // Use real retention from YouTube Analytics, or calculate from data, or fall back to 40%
  const retentionRate = averageViewPercentage ? averageViewPercentage / 100 : 0.4;

  const [daysBetweenPosts, setDaysBetweenPosts] = useState(Math.round(actualCadence));
  const [avgVideoMinutes, setAvgVideoMinutes] = useState(Math.round(actualDuration));
  const [avgViewsPerVideo, setAvgViewsPerVideo] = useState(actualViews);
  const [userHasAdjusted, setUserHasAdjusted] = useState(false);

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
      if (userHasAdjusted) {
        onRatesChange({
          dailyNewSubs: projection.dailyNewSubs,
          dailyWatchHours: projection.dailyWatchHours,
        });
      } else {
        onRatesChange({
          dailyNewSubs: currentSubsPerDay,
          dailyWatchHours: currentHoursPerDay,
        });
      }
    }
  }, [projection.dailyNewSubs, projection.dailyWatchHours, onRatesChange, userHasAdjusted, currentSubsPerDay, currentHoursPerDay]);

  // Report adjusted state to parent
  useEffect(() => {
    onAdjustedChange?.(userHasAdjusted);
  }, [onAdjustedChange, userHasAdjusted]);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-gradient">
          What-If Simulator
        </p>
        <button
          onClick={() => {
            setDaysBetweenPosts(Math.round(actualCadence));
            setAvgVideoMinutes(Math.round(actualDuration));
            setAvgViewsPerVideo(actualViews);
            setUserHasAdjusted(false);
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
            <span className="text-sm font-bold font-[family-name:var(--font-display)] text-accent-gradient">
              {daysBetweenPosts}d
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={daysBetweenPosts}
            onChange={e => { setDaysBetweenPosts(Number(e.target.value)); setUserHasAdjusted(true); }}
            className="w-full"
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
            <span className="text-sm font-bold font-[family-name:var(--font-display)] text-accent-gradient">
              {avgVideoMinutes}
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={60}
            value={avgVideoMinutes}
            onChange={e => { setAvgVideoMinutes(Number(e.target.value)); setUserHasAdjusted(true); }}
            className="w-full"
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
            <span className="text-sm font-bold font-[family-name:var(--font-display)] text-accent-gradient">
              {avgViewsPerVideo.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={10000}
            step={50}
            value={avgViewsPerVideo}
            onChange={e => { setAvgViewsPerVideo(Number(e.target.value)); setUserHasAdjusted(true); }}
            className="w-full"
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
            Using your real average view percentage: <span className="text-accent-gradient font-semibold">{averageViewPercentage.toFixed(1)}%</span>
          </p>
        </div>
      )}
    </div>
  );
}
