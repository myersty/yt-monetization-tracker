'use client';

import { useState } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import FileUpload from '@/components/FileUpload';
import DashboardV2 from '@/components/DashboardV2';
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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 16l4-6 4 4 5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinecap="round" strokeLinejoin="round" />
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
    return <DashboardV2 data={parsedData} onReset={handleReset} />;
  }

  return (
    <main className="v2 min-h-screen flex flex-col relative">
      {/* Ambient floating dots */}
      <div className="v2-ambient">
        {[
          { top: '12%', left: '8%', delay: '0s' },
          { top: '25%', right: '15%', delay: '2s' },
          { top: '45%', left: '5%', delay: '4s' },
          { top: '60%', right: '8%', delay: '1s' },
          { top: '80%', left: '20%', delay: '3s' },
          { top: '15%', right: '30%', delay: '5s' },
          { top: '70%', right: '25%', delay: '7s' },
          { top: '35%', left: '25%', delay: '6s' },
        ].map((pos, i) => (
          <div
            key={i}
            className="v2-dot"
            style={{ ...pos, animationDelay: pos.delay }}
          />
        ))}
      </div>

      {/* ─── Sticky Nav ──────────────────────────────────────────── */}
      <nav className="v2-nav">
        <div className="v2-nav-inner">
          <Link href="/" className="v2-nav-brand">
            <div className="v2-nav-logo">
              <ChartIcon className="w-5 h-5" />
            </div>
            <span>MonTracker</span>
          </Link>

          <div className="v2-nav-links">
            <Link href="/" className="v2-nav-link v2-nav-link-active">Home</Link>
            <Link href="/demo" className="v2-nav-link">Demo</Link>
            <Link href="/privacy" className="v2-nav-link">Privacy</Link>
          </div>

          <div className="v2-nav-right">
            <Link href="/api/auth/login" className="v2-nav-cta">
              Connect YouTube
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="v2-hero">
        <div className="v2-container">
          <div className="v2-hero-content">
            <span className="v2-badge">YouTube Partner Program</span>
            <h1 className="v2-hero-h1">
              A Simple Path to{' '}
              <span className="v2-text-accent">Monetization</span>
            </h1>
            <p className="v2-hero-sub">
              Connect your YouTube channel or upload your analytics to see exactly
              where you stand on the path to 1,000 subscribers and 4,000 watch hours.
            </p>

            {/* Embedded CTA form */}
            <div className="v2-hero-cta-bar">
              <a href="/api/auth/login" className="v2-btn-primary">
                <YouTubeIcon className="w-5 h-5" />
                Connect Your Channel
              </a>
            </div>

            <p className="v2-hero-hint">
              or <Link href="#upload" className="v2-link">upload a CSV</Link> from YouTube Studio
            </p>
          </div>
        </div>
      </section>

      {/* ─── Features (3 cards) ──────────────────────────────────── */}
      <section className="v2-section">
        <div className="v2-container">
          <span className="v2-badge">Features</span>
          <h2 className="v2-section-h2">
            Everything You Need to{' '}
            <span className="v2-text-accent">Track Progress</span>
          </h2>
          <p className="v2-section-sub">
            Three projection models, real-time analytics, and a what-if simulator
            to plan your path to monetization.
          </p>

          <div className="v2-features-grid">
            {[
              {
                icon: <ZapIcon className="w-6 h-6" />,
                title: 'Smart Projections',
                desc: 'Three forecast models — conservative, current pace, and optimistic — so you know exactly when you\'ll hit the thresholds.',
              },
              {
                icon: <ChartIcon className="w-6 h-6" />,
                title: 'Live Analytics',
                desc: 'Connect your YouTube channel for real-time subscriber counts, watch hours, and Shorts-filtered metrics.',
              },
              {
                icon: <ShieldIcon className="w-6 h-6" />,
                title: 'Privacy First',
                desc: 'Your data never leaves your browser. CSV files are parsed locally. OAuth tokens are encrypted end-to-end.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="v2-feature-card">
                <div className="v2-feature-icon">{icon}</div>
                <h3 className="v2-feature-title">{title}</h3>
                <p className="v2-feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Connect / Upload ────────────────────────────────────── */}
      <section id="upload" className="v2-section">
        <div className="v2-container">
          <span className="v2-badge">Get Started</span>
          <h2 className="v2-section-h2">
            Two Ways to{' '}
            <span className="v2-text-accent">Get Your Data</span>
          </h2>

          <div className="v2-options-grid">
            {/* Option A: Connect */}
            <div className="v2-option-card">
              <div className="v2-option-recommended">Recommended</div>
              <div className="v2-option-icon-wrap">
                <YouTubeIcon className="w-8 h-8 text-[#FF0000]" />
              </div>
              <h3 className="v2-feature-title">Connect YouTube</h3>
              <p className="v2-feature-desc" style={{ marginBottom: '24px' }}>
                Automatically pull your analytics data with one click. Shorts are filtered automatically.
              </p>
              <a href="/api/auth/login" className="v2-btn-primary w-full justify-center">
                <YouTubeIcon className="w-5 h-5" />
                Connect Your Channel
              </a>
              <div className="v2-option-perks">
                <span>Accurate sub count</span>
                <span>Shorts filtered</span>
                <span>Auto-refreshes</span>
              </div>
            </div>

            {/* Option B: Upload */}
            <div className="v2-option-card">
              <div className="v2-option-icon-wrap">
                <LockIcon className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="v2-feature-title">Upload CSV</h3>
              <p className="v2-feature-desc" style={{ marginBottom: '24px' }}>
                Export from YouTube Studio and upload. 100% private — your data never leaves your browser.
              </p>
              <FileUpload onFilesSelected={handleFilesSelected} isLoading={isLoading} />
              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── How-to Guide ────────────────────────────────────────── */}
      <section className="v2-section">
        <div className="v2-container v2-container-narrow">
          <span className="v2-badge">How It Works</span>
          <h2 className="v2-section-h2">
            Export Your Data in{' '}
            <span className="v2-text-accent">60 Seconds</span>
          </h2>

          <div className="v2-steps">
            {[
              'Go to YouTube Studio \u2192 Analytics \u2192 click "Advanced Mode"',
              'Set Breakdown to "Date" (click the dropdown, search for "Date")',
              'Click Metrics \u2192 check Views, Watch time (hours), and Subscribers',
              'Set the date range to "Last 365 days"',
              'Click the download icon \u2192 Comma-separated values (.csv)',
              'Drop the downloaded .zip file above (no need to unzip!)',
            ].map((text, i) => (
              <div key={i} className="v2-step">
                <div className="v2-step-number">{i + 1}</div>
                <p className="v2-step-text">{text}</p>
              </div>
            ))}
          </div>

          <p className="v2-section-hint">
            Watch hours are measured on a rolling 365-day window.
          </p>
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────────── */}
      <section className="v2-section">
        <div className="v2-container">
          <div className="v2-cta-banner">
            <h2 className="v2-cta-h2">
              Start Tracking Your{' '}
              <span className="v2-text-accent">Monetization</span>{' '}
              Progress
            </h2>
            <p className="v2-hero-sub" style={{ marginBottom: '32px' }}>
              Join creators using data-driven insights to reach the YouTube Partner Program faster.
            </p>
            <a href="/api/auth/login" className="v2-btn-primary">
              <YouTubeIcon className="w-5 h-5" />
              Connect Your Channel
            </a>
            <p className="v2-hero-hint" style={{ marginTop: '16px' }}>
              or <Link href="/demo" className="v2-link">try the demo</Link> with sample data
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="v2-footer">
        <div className="v2-container">
          <div className="v2-footer-inner">
            <div className="v2-footer-brand">
              <div className="v2-nav-logo" style={{ width: '32px', height: '32px' }}>
                <ChartIcon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-white">MonTracker</span>
            </div>
            <div className="v2-footer-links">
              <Link href="/privacy" className="v2-footer-link">Privacy Policy</Link>
              <span className="text-[var(--gray-400)]">&middot;</span>
              <Link href="/demo" className="v2-footer-link">Demo</Link>
              <span className="text-[var(--gray-400)]">&middot;</span>
              <span className="v2-footer-link">Built by Ty Myers Media LLC</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
