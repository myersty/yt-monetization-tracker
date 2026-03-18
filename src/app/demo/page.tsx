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
      {/* Amber/gold gradient demo banner */}
      <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />

      {/* Demo header bar */}
      <div className="bg-[var(--foreground)] border-b border-[var(--gray-200)]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold text-sm">
              TA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--background)]">
                  TechTalk with Alex
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  Demo
                </span>
              </div>
              <p className="text-xs text-[var(--gray-500)]">
                Sample data for a pre-monetization channel
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="px-4 py-1.5 text-xs font-medium rounded-full border border-[var(--gray-400)] text-[var(--gray-400)] hover:text-[var(--background)] hover:border-[var(--background)] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>

      <Dashboard data={mockData} onReset={handleReset} isOAuthDashboard={true} />
    </div>
  );
}
