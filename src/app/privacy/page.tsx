import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - YouTube Monetization Tracker',
  description: 'Privacy policy for YouTube Monetization Tracker by Ty Myers Media LLC.',
};

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 16l4-6 4 4 5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PrivacyPolicy() {
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
        ].map((pos, i) => (
          <div key={i} className="v2-dot" style={{ ...pos, animationDelay: pos.delay }} />
        ))}
      </div>

      {/* Sticky Nav (same as landing + demo) */}
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

          <div className="v2-nav-right" />
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 py-16 px-6" style={{ paddingTop: '100px' }}>
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-heading-gradient">
              Privacy Policy
            </h1>
            <p className="text-[var(--gray-500)] text-sm mt-2">
              Last updated: March 18, 2026
            </p>
          </div>

          <div className="space-y-10">
            {/* Intro */}
            <section>
              <p className="text-[var(--gray-600)] leading-relaxed">
                YouTube Monetization Tracker (&quot;the App&quot;) is operated by Ty Myers Media LLC.
                This privacy policy explains how we collect, use, and protect your information
                when you use our application.
              </p>
            </section>

            {/* What We Collect */}
            <section>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mb-3">
                What Data We Collect
              </h2>
              <p className="text-[var(--gray-600)] leading-relaxed mb-3">
                When you connect your YouTube channel via Google OAuth, we access the following
                data from the YouTube Analytics API:
              </p>
              <ul className="space-y-2 text-[var(--gray-600)]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>Your channel name and profile thumbnail</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>Subscriber count</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>Watch time hours (with Shorts filtering)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>Daily view counts</span>
                </li>
              </ul>
              <p className="text-[var(--gray-600)] leading-relaxed mt-3">
                When you use the CSV upload option, your files are processed entirely in your
                browser. No file data is sent to our servers.
              </p>
            </section>

            {/* How We Use Data */}
            <section>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mb-3">
                How We Use Your Data
              </h2>
              <p className="text-[var(--gray-600)] leading-relaxed">
                Your analytics data is used solely to display your monetization progress and
                calculate projections for when you may reach YouTube Partner Program thresholds
                (1,000 subscribers and 4,000 watch hours). We do not use your data for advertising,
                marketing, or any purpose other than providing you with the tracking service.
              </p>
            </section>

            {/* Data Storage */}
            <section>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mb-3">
                Data Storage
              </h2>
              <ul className="space-y-2 text-[var(--gray-600)]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>OAuth tokens are stored encrypted in secure, HTTP-only cookies on your browser.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>We do not store your YouTube analytics data on any server or database.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>CSV files uploaded via the browser are processed locally and never leave your device.</span>
                </li>
              </ul>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mb-3">
                Third-Party Services
              </h2>
              <p className="text-[var(--gray-600)] leading-relaxed">
                This application uses the following third-party services:
              </p>
              <ul className="space-y-2 text-[var(--gray-600)] mt-3">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>
                    <strong>Google OAuth 2.0</strong> &mdash; for authenticating your YouTube account.
                    Subject to{' '}
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--gold)] hover:underline"
                    >
                      Google&apos;s Privacy Policy
                    </a>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>
                    <strong>YouTube Data API &amp; YouTube Analytics API</strong> &mdash; for retrieving
                    your channel statistics. Subject to the{' '}
                    <a
                      href="https://www.youtube.com/t/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--gold)] hover:underline"
                    >
                      YouTube Terms of Service
                    </a>.
                  </span>
                </li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mb-3">
                Data Retention
              </h2>
              <p className="text-[var(--gray-600)] leading-relaxed">
                Your data is session-based. Analytics data is fetched in real time when you visit
                the dashboard and is not persisted after your session ends. When you log out or
                disconnect your channel, all tokens are cleared from your browser cookies and no
                data is retained.
              </p>
            </section>

            {/* User Rights */}
            <section>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mb-3">
                Your Rights
              </h2>
              <ul className="space-y-2 text-[var(--gray-600)]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>You can disconnect your YouTube channel at any time via the dashboard.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>
                    You can revoke access through your{' '}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--gold)] hover:underline"
                    >
                      Google Account permissions
                    </a>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                  <span>Since we do not store your analytics data, there is no data to delete from our systems.</span>
                </li>
              </ul>
            </section>

            {/* Contact */}
            <section>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mb-3">
                Contact
              </h2>
              <p className="text-[var(--gray-600)] leading-relaxed">
                If you have questions about this privacy policy or how your data is handled,
                contact us at:{' '}
                <a
                  href="mailto:ty@tymyersmedia.com"
                  className="text-[var(--gold)] hover:underline"
                >
                  ty@tymyersmedia.com
                </a>
              </p>
            </section>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-white/6 text-center">
        <p className="text-xs text-[var(--gray-500)]">
          YouTube Monetization Tracker by Ty Myers Media LLC
        </p>
      </footer>
    </main>
  );
}
