'use client';

import Link from 'next/link';
import { ParsedData } from '@/lib/types';
import Dashboard from './Dashboard';

type DashboardV2Props = {
  data: ParsedData;
  onReset: () => void;
  isOAuthDashboard?: boolean;
};

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 16l4-6 4 4 5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardV2({ data, onReset, isOAuthDashboard = false }: DashboardV2Props) {
  return (
    <div className="v2">
      {/* V2 Ambient dots */}
      <div className="v2-ambient">
        {[
          { top: '12%', left: '8%', delay: '0s' },
          { top: '25%', right: '15%', delay: '2s' },
          { top: '45%', left: '5%', delay: '4s' },
          { top: '60%', right: '8%', delay: '1s' },
          { top: '80%', left: '20%', delay: '3s' },
          { top: '15%', right: '30%', delay: '5s' },
          { top: '35%', left: '25%', delay: '6s' },
          { top: '70%', right: '22%', delay: '7s' },
        ].map((pos, i) => (
          <div key={i} className="v2-dot" style={{ ...pos, animationDelay: pos.delay }} />
        ))}
      </div>

      {/* V2 Sticky Nav */}
      <nav className="v2-nav">
        <div className="v2-nav-inner">
          <Link href="/" className="v2-nav-brand">
            <div className="v2-nav-logo">
              <ChartIcon className="w-5 h-5" />
            </div>
            <span>MonTracker</span>
          </Link>

          <div className="v2-nav-links">
            <Link href="/" className="v2-nav-link">Home</Link>
            <Link href="/demo" className="v2-nav-link">Demo</Link>
            <Link href="/privacy" className="v2-nav-link">Privacy</Link>
          </div>

          <div className="v2-nav-right">
            <button
              onClick={onReset}
              className="v2-nav-link"
              style={{ cursor: 'pointer' }}
            >
              {isOAuthDashboard ? 'Disconnect' : 'New Upload'}
            </button>
          </div>
        </div>
      </nav>

      {/* Existing Dashboard wrapped in v2 scope */}
      <Dashboard data={data} onReset={onReset} isOAuthDashboard={isOAuthDashboard} />

    </div>
  );
}
