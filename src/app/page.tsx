'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import Dashboard from '@/components/Dashboard';
import { parseAllCSVs } from '@/lib/csv-parser';
import { ParsedData } from '@/lib/types';

export default function Home() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await parseAllCSVs(files);

      if (data.daily.length === 0) {
        setError('No data found in the uploaded files. Make sure you exported from YouTube Studio Analytics.');
        setIsLoading(false);
        return;
      }

      setParsedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV files');
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
            Upload your YouTube Studio analytics and see exactly where you stand on
            the path to 1,000 subscribers and 4,000 watch hours.
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="flex-1 bg-[var(--gray-50)] py-16 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Privacy badge */}
          <div className="flex items-center justify-center gap-2 mb-8">
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

          {/* How-to Guide */}
          <div className="mt-12">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg text-center mb-6">
              How to Export Your Data
            </h2>
            <div className="grid gap-4 max-w-md mx-auto">
              {[
                { step: '1', text: 'Go to YouTube Studio \u2192 Analytics' },
                { step: '2', text: 'Click "Advanced Mode" (top right)' },
                { step: '3', text: 'Select your date range (longer is better)' },
                { step: '4', text: 'Click the download icon \u2192 Export as CSV' },
                { step: '5', text: 'Upload all exported files here' },
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
              For best results, export from the Subscribers, Watch Time, and Views tabs separately.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-[var(--gray-200)] text-center">
        <p className="text-xs text-[var(--gray-500)]">
          Built by Ty Myers Media LLC
        </p>
      </footer>
    </main>
  );
}
