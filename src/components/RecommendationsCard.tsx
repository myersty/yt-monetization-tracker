'use client';

type RecommendationsCardProps = {
  avgVideoDurationMinutes?: number;
  avgViewsPerVideo?: number;
  averageViewPercentage?: number;
  postingCadenceDays?: number;
  currentSubscribers: number;
  totalWatchHours: number;
  avgWatchHoursPerVideo?: number;
  videosLast90Days?: number;
};

type Recommendation = {
  icon: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
};

function getRecommendations(props: RecommendationsCardProps): Recommendation[] {
  const {
    avgVideoDurationMinutes,
    avgViewsPerVideo,
    averageViewPercentage,
    postingCadenceDays,
    currentSubscribers,
    totalWatchHours,
  } = props;

  const recs: Recommendation[] = [];

  // Already eligible? Different recommendations
  if (currentSubscribers >= 1000 && totalWatchHours >= 4000) {
    return [{
      icon: '🎉',
      title: 'Apply for the YouTube Partner Program',
      description: 'You\'ve hit both thresholds! Head to YouTube Studio > Monetization to apply.',
      priority: 'high',
    }];
  }

  // Retention recommendations
  if (averageViewPercentage !== undefined) {
    if (averageViewPercentage < 25) {
      recs.push({
        icon: '🎣',
        title: 'Improve your hooks',
        description: `Your audience watches ${averageViewPercentage.toFixed(0)}% of your videos on average. Strong hooks in the first 30 seconds can push this to 35%+. Try opening with a bold claim or question.`,
        priority: 'high',
      });
    } else if (averageViewPercentage < 40) {
      recs.push({
        icon: '📈',
        title: 'Good retention — room to grow',
        description: `Your ${averageViewPercentage.toFixed(0)}% average view percentage is solid. Tighten your pacing and cut filler to push toward 45%+.`,
        priority: 'medium',
      });
    } else {
      recs.push({
        icon: '🔥',
        title: 'Excellent retention',
        description: `${averageViewPercentage.toFixed(0)}% average view percentage is above average. Your content is keeping people engaged — keep doing what you\'re doing.`,
        priority: 'low',
      });
    }
  }

  // Video length recommendations
  if (avgVideoDurationMinutes !== undefined) {
    if (avgVideoDurationMinutes < 5) {
      recs.push({
        icon: '⏱️',
        title: 'Make longer videos',
        description: `Your videos average ${avgVideoDurationMinutes.toFixed(0)} minutes. Videos in the 8-15 minute range earn significantly more watch hours per view. Each extra minute of watch time compounds.`,
        priority: 'high',
      });
    } else if (avgVideoDurationMinutes < 8) {
      recs.push({
        icon: '⏱️',
        title: 'Consider bumping video length',
        description: `At ${avgVideoDurationMinutes.toFixed(0)} minutes, your videos are decent but the sweet spot for watch time is 8-15 minutes. Even adding 2-3 minutes of value can meaningfully accelerate your path.`,
        priority: 'medium',
      });
    }
  }

  // Posting cadence recommendations
  if (postingCadenceDays !== undefined) {
    if (postingCadenceDays > 14) {
      recs.push({
        icon: '📅',
        title: 'Post more consistently',
        description: `You're posting every ${postingCadenceDays.toFixed(0)} days. The algorithm rewards consistency — try to get down to once a week. A predictable schedule helps your audience come back.`,
        priority: 'high',
      });
    } else if (postingCadenceDays > 7) {
      recs.push({
        icon: '📅',
        title: 'Tighten your posting schedule',
        description: `Every ${postingCadenceDays.toFixed(0)} days is a good rhythm. Pushing to weekly uploads would increase your total watch hours significantly.`,
        priority: 'medium',
      });
    }
  }

  // Views recommendations
  if (avgViewsPerVideo !== undefined) {
    if (avgViewsPerVideo < 100) {
      recs.push({
        icon: '🔍',
        title: 'Focus on discoverability',
        description: `Your videos average ${avgViewsPerVideo} views. Optimize your titles and thumbnails for search — use keywords your audience is actually searching for.`,
        priority: 'high',
      });
    } else if (avgViewsPerVideo < 500) {
      recs.push({
        icon: '📊',
        title: 'Growing audience',
        description: `${avgViewsPerVideo} average views per video shows traction. Double down on the topics that perform best and consider creating series content.`,
        priority: 'medium',
      });
    }
  }

  // Bottleneck analysis
  const subsProgress = currentSubscribers / 1000;
  const hoursProgress = totalWatchHours / 4000;

  if (subsProgress > hoursProgress * 1.5) {
    recs.push({
      icon: '🎯',
      title: 'Watch hours are your bottleneck',
      description: 'You\'re ahead on subscribers but behind on watch hours. Focus on making longer, more engaging videos rather than growing your audience right now.',
      priority: 'high',
    });
  } else if (hoursProgress > subsProgress * 1.5) {
    recs.push({
      icon: '🎯',
      title: 'Subscribers are your bottleneck',
      description: 'You\'re ahead on watch hours but behind on subscribers. Add clear calls-to-action asking viewers to subscribe, and engage with comments to build community.',
      priority: 'high',
    });
  }

  return recs;
}

const priorityColors = {
  high: 'border-l-[var(--gold)]',
  medium: 'border-l-[var(--gray-400)]',
  low: 'border-l-[#2E7D32]',
};

export default function RecommendationsCard(props: RecommendationsCardProps) {
  const recommendations = getRecommendations(props);

  if (recommendations.length === 0) return null;

  return (
    <div className="rounded-[var(--card-radius)] border border-white/6 bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)] card-pattern">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-2">
        Channel Insights
      </p>
      <p className="text-[var(--gray-500)] text-sm mb-5">
        Personalized recommendations based on your last 90 days of data.
      </p>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {props.avgVideoDurationMinutes !== undefined && (
          <div className="px-3 py-2 rounded-lg bg-[var(--gray-50)] border border-white/4">
            <p className="text-[10px] text-[var(--gray-500)] uppercase tracking-wider">Avg Length</p>
            <p className="text-sm font-bold font-[family-name:var(--font-display)]">
              {props.avgVideoDurationMinutes.toFixed(1)} min
            </p>
          </div>
        )}
        {props.avgViewsPerVideo !== undefined && (
          <div className="px-3 py-2 rounded-lg bg-[var(--gray-50)] border border-white/4">
            <p className="text-[10px] text-[var(--gray-500)] uppercase tracking-wider">Avg Views</p>
            <p className="text-sm font-bold font-[family-name:var(--font-display)]">
              {props.avgViewsPerVideo.toLocaleString()}
            </p>
          </div>
        )}
        {props.averageViewPercentage !== undefined && (
          <div className="px-3 py-2 rounded-lg bg-[var(--gray-50)] border border-white/4">
            <p className="text-[10px] text-[var(--gray-500)] uppercase tracking-wider">Avg Viewed</p>
            <p className="text-sm font-bold font-[family-name:var(--font-display)]">
              <span className="text-accent-gradient">{props.averageViewPercentage.toFixed(1)}%</span>
            </p>
          </div>
        )}
        {props.avgWatchHoursPerVideo !== undefined && (
          <div className="px-3 py-2 rounded-lg bg-[var(--gray-50)] border border-white/4">
            <p className="text-[10px] text-[var(--gray-500)] uppercase tracking-wider">Hrs / Video</p>
            <p className="text-sm font-bold font-[family-name:var(--font-display)]">
              {props.avgWatchHoursPerVideo.toFixed(1)}
            </p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className={`border-l-2 ${priorityColors[rec.priority]} pl-4 py-2`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{rec.icon}</span>
              <p className="text-sm font-semibold">{rec.title}</p>
            </div>
            <p className="text-xs text-[var(--gray-500)] leading-relaxed">
              {rec.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
