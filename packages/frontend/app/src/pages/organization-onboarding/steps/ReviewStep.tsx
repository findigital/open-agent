import { useEffect, useState } from 'react';
import { Button, toast } from '@afk/component';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';
import { QualityMeter } from '../components/QualityMeter';
import { cn } from '@/lib/utils';

interface ReviewStepProps {
  organizationId: string;
  onNext: () => void;
  onPrev: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ organizationId, onNext, onPrev }) => {
  const { qualityScore, recommendations, loadRecommendations, completeOnboarding } =
    useOrganizationOnboardingStore();

  const [loading, setLoading] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadRecommendations(organizationId);
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      } finally {
        setLoadingRecommendations(false);
      }
    };
    loadData();
  }, [organizationId, loadRecommendations]);

  const handleComplete = async () => {
    setLoading(true);

    try {
      await completeOnboarding(organizationId);
      toast.success('Onboarding completed! 🎉');
      onNext();
    } catch (error) {
      toast.error('Failed to complete onboarding');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 81) return 'text-green-600';
    if (score >= 61) return 'text-yellow-600';
    if (score >= 41) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 91) return 'Outstanding';
    if (score >= 81) return 'Excellent';
    if (score >= 61) return 'Good';
    if (score >= 41) return 'Fair';
    return 'Getting Started';
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'identity':
        return '🏢';
      case 'needs':
        return '⭐';
      case 'programs':
        return '📋';
      case 'capacity':
        return '👥';
      case 'impact':
        return '📈';
      default:
        return '📌';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Profile</h2>
      <p className="text-gray-600 mb-6">
        Review your quality score and recommendations to strengthen your organization profile.
      </p>

      {/* Quality Score Overview */}
      {qualityScore && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Organization Context Quality</h3>
            <div className="text-right">
              <div className={cn('text-3xl font-bold', getScoreColor(qualityScore.overall))}>
                {qualityScore.overall}/100
              </div>
              <div className="text-sm text-gray-600">{getScoreLabel(qualityScore.overall)}</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            <div className="text-center p-3 border border-gray-200 rounded-lg">
              <div className="text-xs font-medium text-gray-600 mb-1">Identity</div>
              <div className={cn('text-2xl font-bold', getScoreColor(qualityScore.identity))}>
                {qualityScore.identity}
              </div>
            </div>
            <div className="text-center p-3 border border-gray-200 rounded-lg">
              <div className="text-xs font-medium text-gray-600 mb-1">Needs ⭐</div>
              <div className={cn('text-2xl font-bold', getScoreColor(qualityScore.needs))}>
                {qualityScore.needs}
              </div>
            </div>
            <div className="text-center p-3 border border-gray-200 rounded-lg">
              <div className="text-xs font-medium text-gray-600 mb-1">Programs</div>
              <div className={cn('text-2xl font-bold', getScoreColor(qualityScore.programs))}>
                {qualityScore.programs}
              </div>
            </div>
            <div className="text-center p-3 border border-gray-200 rounded-lg">
              <div className="text-xs font-medium text-gray-600 mb-1">Capacity</div>
              <div className={cn('text-2xl font-bold', getScoreColor(qualityScore.capacity))}>
                {qualityScore.capacity}
              </div>
            </div>
            <div className="text-center p-3 border border-gray-200 rounded-lg">
              <div className="text-xs font-medium text-gray-600 mb-1">Impact</div>
              <div className={cn('text-2xl font-bold', getScoreColor(qualityScore.impact))}>
                {qualityScore.impact}
              </div>
            </div>
          </div>

          {/* Overall Assessment */}
          <div
            className={cn(
              'p-4 rounded-lg border',
              qualityScore.overall >= 80
                ? 'bg-green-50 border-green-200'
                : qualityScore.overall >= 60
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-orange-50 border-orange-200'
            )}
          >
            <p className="text-sm font-medium text-gray-900">
              {qualityScore.overall >= 80
                ? '✅ Excellent! Your profile is ready to write high-quality grant proposals.'
                : qualityScore.overall >= 60
                ? '👍 Good progress! Adding the recommended details below will significantly improve proposal quality.'
                : '🚀 You\'re on your way! Complete the recommendations below to unlock better proposal writing.'}
            </p>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {loadingRecommendations ? (
        <div className="text-center py-8 text-gray-500">Loading recommendations...</div>
      ) : recommendations.length > 0 ? (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recommendations to Improve Quality ({recommendations.length})
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getCategoryIcon(rec.category)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{rec.action}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {rec.category} · {rec.estimatedTime}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={cn(
                            'text-xs font-semibold px-2 py-1 rounded border',
                            getPriorityColor(rec.priority)
                          )}
                        >
                          {rec.priority}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200">
                          +{rec.pointsGain} pts
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{rec.benefit}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> You can add this information now by going back, or complete onboarding and add it
              later from your organization settings.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-lg font-semibold text-green-900 mb-1">Perfect Profile!</h3>
          <p className="text-sm text-green-700">
            Your organization profile is complete and ready to generate high-quality proposals.
          </p>
        </div>
      )}

      {/* Quick Stats Summary */}
      <div className="mb-8 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-600 mb-1">Quality Score</div>
            <div className="font-semibold text-gray-900">
              {qualityScore ? `${qualityScore.overall}/100` : 'Not calculated'}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-gray-600 mb-1">Recommendations</div>
            <div className="font-semibold text-gray-900">{recommendations.length} remaining</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button onClick={onPrev} variant="outline" disabled={loading}>
          Back
        </Button>
        <Button onClick={handleComplete} variant="primary" disabled={loading} size="large">
          {loading ? 'Completing...' : 'Complete Onboarding 🎉'}
        </Button>
      </div>
    </div>
  );
};
