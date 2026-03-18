'use client';

import { useState } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import FileUpload from '@/components/FileUpload';
import Dashboard from '@/components/Dashboard';
import { parseAllCSVs } from '@/lib/csv-parser';
import { ParsedData } from '@/lib/types';

async function extractCSVsFromZip(file: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(file);
  const csvFiles: File[] = [];

  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    if (filename.toLowerCase().endsWith('.csv')) {
      const blob = await zipEntry.async('blob');
      csvFiles.push(new File([blob], filename, { type: 'text/csv' }));
    }
  }

  return csvFiles;
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function Home() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    try {
      // If any file is a zip, extract CSVs from it
      let csvFiles: File[] = [];
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip') {
          const extracted = await extractCSVsFromZip(file);
          csvFiles.push(...extracted);
        } else {
          csvFiles.push(file);
        }
      }

      if (csvFiles.length === 0) {
        setError('No CSV files found. Upload a .zip or .csv file from YouTube Studio.');
        setIsLoading(false);
        return;
      }

      const data = await parseAllCSVs(csvFiles);

      if (data.daily.length === 0) {
        setError('No data found in the uploaded files. Make sure you exported from YouTube Studio Analytics.');
        setIsLoading(false);
        return;
      }

      setParsedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setError(null);
  };

  if (parsedData) {
    return <Dashboard data={parsedData} onReset={handleReset} />;
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="bg-[var(--foreground)] text-[var(--background)] py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gold)] mb-4">
            YouTube Partner Program
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(28px,5vw,42px)] font-bold leading-tight mb-4">
            How Close Are You to Monetization?
          </h1>
          <p className="text-[var(--gray-400)] text-lg leading-relaxed max-w-lg mx-auto">
            Connect your YouTube channel or upload your analytics to see exactly
            where you stand on the path to 1,000 subscribers and 4,000 watch hours.
          </p>
        </div>
      </div>

      {/* Options Section */}
      <div className="flex-1 bg-[var(--gray-50)] py-16 px-6">
        <div className="max-w-2xl mx-auto">

          {/* Option A: Connect with YouTube */}
          <div className="rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-8 shadow-[var(--card-shadow)] mb-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-3">
                <YouTubeIcon className="w-6 h-6 text-[#FF0000]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--gold)]">
                  Recommended
                </span>
              </div>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mb-2">
                Connect Your YouTube Channel
              </h2>
              <p className="text-sm text-[var(--gray-600)]">
                Automatically pull your analytics data
              </p>
            </div>

            <a
              href="/api/auth/login"
              className="flex items-center justify-center gap-3 w-full max-w-sm mx-auto px-6 py-3.5 rounded-full bg-[var(--gold)] text-white font-semibold text-base transition-all duration-200 hover:bg-[var(--gold-hover)] hover:shadow-lg hover:shadow-[var(--gold)]/20 active:scale-[0.98]"
            >
              <YouTubeIcon className="w-5 h-5" />
              Connect Your YouTube Channel
            </a>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto">
              {[
                { icon: '👥', text: 'Accurate subscriber count' },
                { icon: '⏱️', text: 'Real watch hours (Shorts filtered)' },
                { icon: '🔄', text: 'Auto-refreshes daily' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-[var(--gray-700)]">
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-[var(--gray-300)]" />
            <span className="text-sm font-medium text-[var(--gray-500)] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[var(--gray-300)]" />
          </div>

          {/* Option B: Upload CSV */}
          <div className="rounded-[var(--card-radius)] border border-[var(--gray-200)] bg-[var(--background)] p-8 shadow-[var(--card-shadow)]">
            <div className="text-center mb-6">
              <h2 className="font-[family-name:var(--font-display)] font-bold text-lg mb-2">
                Upload CSV
              </h2>
              <p className="text-sm text-[var(--gray-600)]">
                Export from YouTube Studio and upload
              </p>
            </div>

            {/* Privacy badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <svg className="w-4 h-4 text-[#2E7D32]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-[var(--gray-600)]">
                Your data never leaves your browser. Everything is processed locally.
              </p>
            </div>

            <FileUpload onFilesSelected={handleFilesSelected} isLoading={isLoading} />

            {error && (
              <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
                {error}
              </div>
            )}
          </div>

          {/* How-to Guide */}
          <div className="mt-12">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg text-center mb-6">
              How to Export Your Data
            </h2>
            <div className="grid gap-4 max-w-lg mx-auto">
              {[
                { step: '1', text: 'Go to YouTube Studio \u2192 Analytics \u2192 click "Advanced Mode" (top right)' },
                { step: '2', text: 'Set Breakdown to "Date" (click the dropdown, search for "Date")' },
                { step: '3', text: 'Click Metrics \u2192 check Views, Watch time (hours), and Subscribers \u2192 Apply' },
                { step: '4', text: 'Set the date range to "Last 365 days"' },
                { step: '5', text: 'Click the download icon \u2192 Comma-separated values (.csv)' },
                { step: '6', text: 'Drop the downloaded .zip file here (no need to unzip!)' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-full bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center text-sm font-bold font-[family-name:var(--font-display)] flex-shrink-0">
                    {step}
                  </span>
                  <p className="text-sm text-[var(--gray-700)]">{text}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-[var(--gray-500)] mt-6">
              Watch hours are measured on a rolling 365-day window. The &quot;Table data.csv&quot; file has everything we need.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-[var(--gray-200)] text-center">
        <div className="flex items-center justify-center gap-4">
          <p className="text-xs text-[var(--gray-500)]">
            Built by Ty Myers Media LLC
          </p>
          <span className="text-[var(--gray-400)]">&middot;</span>
          <Link href="/privacy" className="text-xs text-[var(--gray-500)] hover:text-[var(--gold)] transition-colors">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </main>
  );
}
