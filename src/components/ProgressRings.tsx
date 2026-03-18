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
    <div className="flex flex-col items-center">
      <div className="relative w-[300px] h-[300px]">
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
          <p className="text-3xl font-bold font-[family-name:var(--font-display)] text-[var(--foreground)]">
            {Math.round(Math.min(((subsPercent + hoursPercent) / 2), 100))}%
          </p>
          <p className="text-xs uppercase tracking-wider text-[var(--gray-600)] font-semibold mt-1">
            To Monetization
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-8 mt-6">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[var(--gold)]" />
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--gray-600)] font-semibold">
              Subscribers
            </p>
            <p className="font-[family-name:var(--font-display)] font-bold text-lg">
              {currentSubscribers.toLocaleString()}
              <span className="text-[var(--gray-500)] text-sm font-normal"> / {subscriberGoal.toLocaleString()}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#1565C0]" />
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--gray-600)] font-semibold">
              Watch Hours
            </p>
            <p className="font-[family-name:var(--font-display)] font-bold text-lg">
              {Math.round(totalWatchHours).toLocaleString()}
              <span className="text-[var(--gray-500)] text-sm font-normal"> / {watchHoursGoal.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
