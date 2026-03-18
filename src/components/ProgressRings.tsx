'use client';

import { useEffect, useState } from 'react';

type ProgressRingsProps = {
  currentSubscribers: number;
  totalWatchHours: number;
  subscriberGoal?: number;
  watchHoursGoal?: number;
};

function Ring({
  value,
  goal,
  radius,
  strokeWidth,
  color,
  label,
  delay = 0,
}: {
  value: number;
  goal: number;
  radius: number;
  strokeWidth: number;
  color: string;
  label: string;
  delay?: number;
}) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / goal, 1);
  const offset = circumference - animatedProgress * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, delay);
    return () => clearTimeout(timer);
  }, [progress, delay]);

  const percentage = Math.round(progress * 100);
  const displayValue = value >= goal
    ? goal.toLocaleString()
    : value.toLocaleString();

  return (
    <g>
      {/* Background track */}
      <circle
        cx="150"
        cy="150"
        r={radius}
        fill="none"
        stroke="var(--gray-200)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx="150"
        cy="150"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 150 150)"
        style={{
          transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      {/* Completion checkmark for achieved goals */}
      {value >= goal && (
        <circle
          cx="150"
          cy={150 - radius}
          r={strokeWidth / 2 + 2}
          fill={color}
          transform="rotate(-90 150 150)"
        />
      )}
    </g>
  );
}

export default function ProgressRings({
  currentSubscribers,
  totalWatchHours,
  subscriberGoal = 1000,
  watchHoursGoal = 4000,
}: ProgressRingsProps) {
  const subsPercent = Math.min(Math.round((currentSubscribers / subscriberGoal) * 100), 100);
  const hoursPercent = Math.min(Math.round((totalWatchHours / watchHoursGoal) * 100), 100);

  return (
    <div className="flex items-center justify-center gap-6 sm:gap-10">
      {/* Left — Subscribers */}
      <div className="flex flex-col items-end text-right">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" />
          <p className="text-xs uppercase tracking-wider text-[var(--gray-600)] font-semibold">
            Subscribers
          </p>
        </div>
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="font-[family-name:var(--font-display)] font-bold text-3xl sm:text-4xl text-[var(--foreground)]">
            {currentSubscribers.toLocaleString()}
          </span>
          <span className="text-sm text-[var(--gray-500)]">/ {subscriberGoal.toLocaleString()}</span>
        </div>
      </div>

      {/* Center — Rings */}
      <div className="relative w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] flex-shrink-0">
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {/* Outer ring — Subscribers */}
          <Ring
            value={currentSubscribers}
            goal={subscriberGoal}
            radius={130}
            strokeWidth={14}
            color="var(--gold)"
            label="Subscribers"
            delay={200}
          />
          {/* Inner ring — Watch Hours */}
          <Ring
            value={totalWatchHours}
            goal={watchHoursGoal}
            radius={105}
            strokeWidth={14}
            color="#1565C0"
            label="Watch Hours"
            delay={400}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] text-[var(--foreground)]">
            {Math.round(Math.min(((subsPercent + hoursPercent) / 2), 100))}%
          </p>
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--gray-600)] font-semibold mt-1">
            To Monetization
          </p>
        </div>
      </div>

      {/* Right — Watch Hours */}
      <div className="flex flex-col items-start text-left">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1565C0]" />
          <p className="text-xs uppercase tracking-wider text-[var(--gray-600)] font-semibold">
            Watch Hours
          </p>
        </div>
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="font-[family-name:var(--font-display)] font-bold text-3xl sm:text-4xl text-[var(--foreground)]">
            {Math.round(totalWatchHours).toLocaleString()}
          </span>
          <span className="text-sm text-[var(--gray-500)]">/ {watchHoursGoal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
