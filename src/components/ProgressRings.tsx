'use client';

import { useEffect, useState } from 'react';
import { useCountUp } from '@/lib/useCountUp';

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
  gradientId,
  glowColor,
  delay = 0,
}: {
  value: number;
  goal: number;
  radius: number;
  strokeWidth: number;
  gradientId: string;
  glowColor: string;
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

  // Calculate the endpoint position for the glow dot
  const endAngle = -90 + animatedProgress * 360;
  const endAngleRad = (endAngle * Math.PI) / 180;
  const endX = 150 + radius * Math.cos(endAngleRad);
  const endY = 150 + radius * Math.sin(endAngleRad);

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
        opacity={0.4}
      />
      {/* Progress arc with gradient */}
      <circle
        cx="150"
        cy="150"
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 150 150)"
        style={{
          transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: `drop-shadow(0 0 6px ${glowColor})`,
        }}
      />
      {/* Glowing endpoint dot */}
      {animatedProgress > 0.01 && (
        <g style={{ transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          {/* Outer glow */}
          <circle
            cx={endX}
            cy={endY}
            r={strokeWidth / 2 + 4}
            fill={glowColor}
            opacity={0.3}
            style={{ filter: `blur(4px)` }}
          />
          {/* Inner bright dot */}
          <circle
            cx={endX}
            cy={endY}
            r={strokeWidth / 2 + 1}
            fill="white"
            opacity={0.9}
          />
        </g>
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

  const animatedSubs = useCountUp(currentSubscribers, 900, 200);
  const animatedHours = useCountUp(Math.round(totalWatchHours), 900, 400);
  const animatedPercent = useCountUp(Math.round(Math.min(((subsPercent + hoursPercent) / 2), 100)), 800, 600);

  return (
    <div className="flex items-center justify-center gap-6 sm:gap-10">
      {/* Left — Subscribers */}
      <div className="flex flex-col items-end text-right">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #FFC83B, #FF6B00)' }} />
          <p className="text-[11px] uppercase tracking-wider text-[var(--gray-500)] font-semibold">
            Subscribers
          </p>
        </div>
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="font-[family-name:var(--font-display)] font-bold text-4xl sm:text-5xl text-[var(--foreground)]">
            {animatedSubs.toLocaleString()}
          </span>
          <span className="text-sm text-[var(--gray-500)]">/ {subscriberGoal.toLocaleString()}</span>
        </div>
      </div>

      {/* Center — Rings */}
      <div className="relative w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] flex-shrink-0">
        <svg viewBox="0 0 300 300" className="w-full h-full" style={{ overflow: 'visible' }}>
          <defs>
            {/* Subscriber ring gradient: dark orange → bright gold */}
            <linearGradient id="subsGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8B4513" />
              <stop offset="40%" stopColor="#FF6B00" />
              <stop offset="70%" stopColor="#FF8C33" />
              <stop offset="100%" stopColor="#FFC83B" />
            </linearGradient>
            {/* Watch hours ring gradient: dark blue → bright blue */}
            <linearGradient id="hoursGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0D47A1" />
              <stop offset="40%" stopColor="#1565C0" />
              <stop offset="70%" stopColor="#1E88E5" />
              <stop offset="100%" stopColor="#42A5F5" />
            </linearGradient>
            {/* Glow filters */}
            <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer ring — Subscribers */}
          <Ring
            value={currentSubscribers}
            goal={subscriberGoal}
            radius={130}
            strokeWidth={14}
            gradientId="subsGradient"
            glowColor="rgba(255, 107, 0, 0.6)"
            delay={200}
          />
          {/* Inner ring — Watch Hours */}
          <Ring
            value={totalWatchHours}
            goal={watchHoursGoal}
            radius={105}
            strokeWidth={14}
            gradientId="hoursGradient"
            glowColor="rgba(21, 101, 192, 0.6)"
            delay={400}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] text-[var(--foreground)]">
            {animatedPercent}%
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
          <p className="text-[11px] uppercase tracking-wider text-[var(--gray-500)] font-semibold">
            Watch Hours
          </p>
        </div>
        <div className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="font-[family-name:var(--font-display)] font-bold text-4xl sm:text-5xl text-[var(--foreground)]">
            {animatedHours.toLocaleString()}
          </span>
          <span className="text-sm text-[var(--gray-500)]">/ {watchHoursGoal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
