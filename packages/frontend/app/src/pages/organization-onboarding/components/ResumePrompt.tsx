import { Button } from '@afk/component';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';

interface ResumePromptProps {
  organizationId: string;
  onResume: () => void;
  onStartOver: () => void;
}

export const ResumePrompt: React.FC<ResumePromptProps> = ({ organizationId, onResume, onStartOver }) => {
  const { progress, qualityScore } = useOrganizationOnboardingStore();

  if (!progress || progress.currentStep === 0 || progress.isComplete) {
    return null;
  }

  const totalSteps = 7;
  const completionPct = Math.round((progress.completedSteps.length / totalSteps) * 100);
  const projectedScore = qualityScore ? Math.min(100, qualityScore.overall + 30) : 75;
  const stepsRemaining = totalSteps - progress.completedSteps.length;
  const timeRemaining = Math.max(1, stepsRemaining) * 1.5; // ~1.5 min per step

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
        <span>👋</span> Welcome back!
      </h3>
      <p className="text-sm text-blue-700 mb-4">
        You're {completionPct}% done with your organization profile.
      </p>

      {/* Progress Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-gray-600 text-xs mb-1">Current Quality</div>
          <div className="text-lg font-bold text-gray-900">{qualityScore?.overall || 0}/100</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-gray-600 text-xs mb-1">Projected Quality</div>
          <div className="text-lg font-bold text-green-600">{projectedScore}/100</div>
          <div className="text-xs text-green-600">+{projectedScore - (qualityScore?.overall || 0)}</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-gray-600 text-xs mb-1">Time Remaining</div>
          <div className="text-lg font-bold text-gray-900">~{timeRemaining} min</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {progress.completedSteps.length} of {totalSteps} steps completed
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onResume} variant="primary">
          Resume from Step {progress.currentStep}
        </Button>
        <Button onClick={onStartOver} variant="outline">
          Start Over
        </Button>
      </div>
    </div>
  );
};
