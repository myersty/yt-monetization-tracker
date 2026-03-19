'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardV2 from '@/components/DashboardV2';
import { ParsedData } from '@/lib/types';

type AuthStatus = {
  authenticated: boolean;
  channel?: {
    name: string;
    thumbnail: string;
    subscriberCount: number;
  };
};

type LoadingState = 'checking' | 'loading' | 'ready' | 'error';

export default function DashboardPage() {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>('checking');
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuthAndFetchData() {
      try {
        // Step 1: Check authentication
        const authRes = await fetch('/api/auth/status');
        if (!authRes.ok) {
          router.replace('/');
          return;
        }

        const authData: AuthStatus = await authRes.json();
        if (!authData.authenticated) {
          router.replace('/');
          return;
        }

        setAuthStatus(authData);
        setLoadingState('loading');

        // Step 2: Fetch YouTube analytics data
        const dataRes = await fetch('/api/youtube/data');
        if (!dataRes.ok) {
          const errBody = await dataRes.json().catch(() => ({}));
          throw new Error(errBody.error || 'Failed to fetch analytics data');
        }

        const data: ParsedData = await dataRes.json();
        setParsedData(data);
        setLoadingState('ready');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setLoadingState('error');
      }
    }

    checkAuthAndFetchData();
  }, [router]);

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Logout best-effort
    }
    router.replace('/');
  };

  const handleReset = () => {
    router.replace('/');
  };

  // Checking auth state
  if (loadingState === 'checking') {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center gap-1.5 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" style={{ animation: 'pulse 1.4s infinite' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" style={{ animation: 'pulse 1.4s infinite 0.2s' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" style={{ animation: 'pulse 1.4s infinite 0.4s' }} />
          </div>
          <p className="text-[var(--gray-600)] text-sm font-[family-name:var(--font-display)]">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Loading analytics data
  if (loadingState === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center gap-1.5 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" style={{ animation: 'pulse 1.4s infinite' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" style={{ animation: 'pulse 1.4s infinite 0.2s' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" style={{ animation: 'pulse 1.4s infinite 0.4s' }} />
          </div>
          <p className="text-[var(--gray-600)] text-sm font-[family-name:var(--font-display)]">
            Pulling your YouTube analytics...
          </p>
          {authStatus?.channel && (
            <p className="text-[var(--gray-500)] text-xs mt-2">
              Connected as {authStatus.channel.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (loadingState === 'error') {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="rounded-[var(--card-radius)] border border-red-200 bg-red-50 p-8 shadow-[var(--card-shadow)]">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg mb-2 text-red-800">
              Something went wrong
            </h2>
            <p className="text-sm text-red-600 mb-6">
              {error}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 text-sm font-medium rounded-full bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 text-sm font-medium rounded-full border border-[var(--gray-300)] text-[var(--gray-700)] hover:border-[var(--gray-400)] transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ready state with data
  if (parsedData) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)]">
        {/* Minimal channel identity */}
        {authStatus?.channel && (
          <div className="max-w-6xl mx-auto px-6 pt-6 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {authStatus.channel.thumbnail && (
                  <img
                    src={authStatus.channel.thumbnail}
                    alt={authStatus.channel.name}
                    className="w-9 h-9 rounded-full border border-white/10"
                  />
                )}
                <p className="text-sm font-medium text-[var(--gray-600)]">
                  {authStatus.channel.name}
                </p>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-xs text-[var(--gray-500)] hover:text-red-400 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        <DashboardV2 data={parsedData} onReset={handleReset} isOAuthDashboard={true} />
      </div>
    );
  }

  return null;
}
