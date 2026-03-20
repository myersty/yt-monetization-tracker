'use client';

import { TopVideo } from '@/lib/types';

type TopPerformingContentProps = {
  videos: TopVideo[];
};

export default function TopPerformingContent({ videos }: TopPerformingContentProps) {
  if (videos.length === 0) return null;

  const maxViews = videos[0]?.views || 1;

  return (
    <div className="card p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent-gradient mb-1">
        Top Performing Content
      </p>
      <p className="text-[var(--gray-500)] text-sm mb-5">
        Your best videos by views — double down on what works.
      </p>

      <div className="space-y-3">
        {videos.slice(0, 5).map((video, i) => {
          const barWidth = (video.views / maxViews) * 100;
          const daysAgo = video.publishedDaysAgo;
          const timeLabel = daysAgo < 30
            ? `${daysAgo}d ago`
            : daysAgo < 60
              ? `${Math.round(daysAgo / 7)}w ago`
              : `${Math.round(daysAgo / 30)}mo ago`;

          return (
            <div key={i} className="group">
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold font-[family-name:var(--font-display)] text-[var(--gray-400)] w-5 text-right flex-shrink-0 pt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-accent-gradient transition-colors">
                    {video.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--gray-500)]">
                    <span>{video.views.toLocaleString()} views</span>
                    <span>{video.watchHours.toLocaleString()} hrs</span>
                    <span>{timeLabel}</span>
                  </div>
                  <div className="mt-1.5 h-[3px] bg-[var(--gray-200)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${barWidth}%`,
                        background: i === 0 ? 'var(--gold)' : 'var(--gray-400)',
                        boxShadow: i === 0 ? '0 0 8px rgba(255, 107, 0, 0.5)' : 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
