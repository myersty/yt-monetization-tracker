'use client';

import { useState, useMemo } from 'react';

type WhatIfSimulatorProps = {
  currentSubscribers: number;
  totalWatchHours: number;
  currentSubsPerDay: number;
  currentHoursPerDay: number;
};

export default function WhatIfSimulator({
  currentSubscribers,
  totalWatchHours,
  currentSubsPerDay,
  currentHoursPerDay,
}: WhatIfSimulatorProps) {
  const [videosPerWeek, setVideosPerWeek] = useState(2);
  const [avgVideoMinutes, setAvgVideoMinutes] = useState(10);
  const [avgViewsPerVideo, setAvgViewsPerVideo] = useState(500);

  const projection = useMemo(() => {
    // Rough estimates:
    // Average view duration ~ 40% of video length for good content
    const avgWatchMinutesPerView = avgVideoMinutes * 0.4;
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
  }, [videosPerWeek, avgVideoMinutes, avgViewsPerVideo, currentSubscribers, totalWatchHours]);

  return (
    <div className="rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-6 shadow-[var(--card-shadow)]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-1">
        What-If Simulator
      </p>
      <p className="text-[var(--gray-500)] text-sm mb-6">
        Adjust the sliders to see how your posting schedule affects your timeline.
      </p>

      <div className="space-y-5">
        {/* Videos per week */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium">Videos per week</label>
            <span className="text-sm font-bold font-[family-name:var(--font-display)] text-[var(--gold)]">
              {videosPerWeek}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={7}
            value={videosPerWeek}
            onChange={e => setVideosPerWeek(Number(e.target.value))}
            className="w-full accent-[var(--gold)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--gray-500)]">
            <span>1</span>
            <span>7</span>
          </div>
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
        </div>
      </div>

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
            <p className="text-[var(--gold)] font-semibold mt-1">
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
