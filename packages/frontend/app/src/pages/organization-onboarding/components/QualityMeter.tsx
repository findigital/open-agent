import { cn } from '@/lib/utils';

export interface QualityScore {
  identity: number;
  needs: number;
  programs: number;
  capacity: number;
  impact: number;
  overall: number;
}

interface QualityMeterProps {
  score: QualityScore;
  size?: 'small' | 'medium' | 'large';
}

const getScoreColor = (score: number): string => {
  if (score >= 81) return 'bg-green-500';
  if (score >= 61) return 'bg-yellow-500';
  if (score >= 41) return 'bg-orange-500';
  return 'bg-red-500';
};

const getScoreTextColor = (score: number): string => {
  if (score >= 81) return 'text-green-700';
  if (score >= 61) return 'text-yellow-700';
  if (score >= 41) return 'text-orange-700';
  return 'text-red-700';
};

const getScoreLabel = (score: number): string => {
  if (score >= 91) return 'Outstanding';
  if (score >= 81) return 'Excellent';
  if (score >= 61) return 'Good';
  if (score >= 41) return 'Fair';
  return 'Getting Started';
};

const CategoryBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="text-gray-600">{score}%</span>
    </div>
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={cn('h-full transition-all duration-500', color)}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

export const QualityMeter: React.FC<QualityMeterProps> = ({ score, size = 'medium' }) => {
  const categories = [
    { label: 'Identity', score: score.identity, key: 'identity' },
    { label: 'Needs', score: score.needs, key: 'needs' },
    { label: 'Programs', score: score.programs, key: 'programs' },
    { label: 'Capacity', score: score.capacity, key: 'capacity' },
    { label: 'Impact', score: score.impact, key: 'impact' },
  ];

  const overallColor = getScoreColor(score.overall);
  const overallTextColor = getScoreTextColor(score.overall);
  const overallLabel = getScoreLabel(score.overall);

  if (size === 'small') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-500', overallColor)}
            style={{ width: `${score.overall}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-700 min-w-[3rem] text-right">
          {score.overall}/100
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Organization Context Quality</h3>
          <span className={cn('text-sm font-medium px-2 py-1 rounded', overallTextColor, 'bg-opacity-10')}>
            {overallLabel}
          </span>
        </div>

        <div className="relative">
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500', overallColor)}
              style={{ width: `${score.overall}%` }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow">
              {score.overall}/100
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          {score.overall >= 80
            ? 'Excellent context! Ready to write compelling proposals.'
            : score.overall >= 60
            ? 'Good context. Adding more details will improve proposal quality.'
            : 'Keep building your profile to unlock higher quality proposals.'}
        </p>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category Breakdown</h4>
        {categories.map((category) => (
          <CategoryBar
            key={category.key}
            label={category.label}
            score={category.score}
            color={getScoreColor(category.score)}
          />
        ))}
      </div>
    </div>
  );
};
