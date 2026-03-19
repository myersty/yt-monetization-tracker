'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Dashboard from '@/components/Dashboard';
import { generateMockData } from '@/lib/mock-data';

export default function DemoPage() {
  const mockData = useMemo(() => generateMockData(), []);

  const handleReset = () => {
    // In demo mode, "reset" just goes back to home
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Minimal demo header */}
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold text-xs">
              TA
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[var(--gray-600)]">
                TechTalk with Alex
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-400/10 text-amber-400 border border-amber-400/20">
                Demo
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs text-[var(--gray-500)] hover:text-[var(--gold)] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>

      <Dashboard data={mockData} onReset={handleReset} isOAuthDashboard={true} />
    </div>
  );
}
