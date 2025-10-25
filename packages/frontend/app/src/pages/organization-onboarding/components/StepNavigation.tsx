import { useNavigate } from 'react-router';
import { Button, toast } from '@afk/component';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';

interface StepNavigationProps {
  organizationId: string;
  onNext?: () => void;
  onPrev?: () => void;
  loading?: boolean;
  nextLabel?: string;
  showSkip?: boolean;
  nextDisabled?: boolean;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  organizationId,
  onNext,
  onPrev,
  loading = false,
  nextLabel = 'Continue',
  showSkip = true,
  nextDisabled = false,
}) => {
  const { skipOnboarding } = useOrganizationOnboardingStore();
  const navigate = useNavigate();

  const handleSkip = async () => {
    try {
      await skipOnboarding(organizationId);
      toast.info('Progress saved! You can resume anytime from your organization profile.');
      navigate('/proposals');
    } catch (error) {
      console.error('Failed to skip:', error);
      toast.error('Failed to save progress');
    }
  };

  return (
    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
      {onPrev && (
        <Button onClick={onPrev} variant="outline" disabled={loading}>
          Back
        </Button>
      )}
      {!onPrev && <div />} {/* Spacer */}

      <div className="flex gap-3">
        {showSkip && (
          <Button onClick={handleSkip} variant="text" className="text-gray-500" disabled={loading}>
            Skip for now
          </Button>
        )}
        {onNext && (
          <Button onClick={onNext} variant="primary" disabled={loading || nextDisabled}>
            {loading ? 'Saving...' : nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
