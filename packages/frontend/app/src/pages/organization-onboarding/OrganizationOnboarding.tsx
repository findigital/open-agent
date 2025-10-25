import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Loading } from '@afk/component';
import { ArrowLeftIcon, ArrowRightIcon } from '@blocksuite/icons/rc';

import { cn } from '@/lib/utils';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';
import { QualityMeter } from './components/QualityMeter';
import { ProgressStepper } from './components/ProgressStepper';
import { ResumePrompt } from './components/ResumePrompt';
import { WelcomeStep } from './steps/WelcomeStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { MissionNeedsStep } from './steps/MissionNeedsStep';
import { ProgramsStep } from './steps/ProgramsStep';
import { CapacityStep } from './steps/CapacityStep';
import { ReviewStep } from './steps/ReviewStep';
import { SuccessStep } from './steps/SuccessStep';

const STEPS = [
  { number: 0, title: 'Welcome', description: 'Get started' },
  { number: 1, title: 'Basic Info', description: 'Organization details' },
  { number: 2, title: 'Mission & Needs', description: 'Purpose & community needs' },
  { number: 3, title: 'Programs', description: 'Services & impact' },
  { number: 4, title: 'Capacity', description: 'Team & resources' },
  { number: 5, title: 'Review', description: 'AI processing' },
  { number: 6, title: 'Complete', description: 'Success!' },
];

export const OrganizationOnboarding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const organizationId = searchParams.get('organizationId');

  const {
    currentStep,
    qualityScore,
    progress,
    loadProgress,
    loadQualityScore,
    startOnboarding,
    setCurrentStep,
    reset,
    resumeOnboarding,
  } = useOrganizationOnboardingStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setError('No organization selected');
      setLoading(false);
      return;
    }

    const initialize = async () => {
      try {
        setLoading(true);
        // Try to load existing progress
        await loadProgress(organizationId);
        await loadQualityScore(organizationId);
      } catch (err) {
        // If no progress exists, start new onboarding
        try {
          await startOnboarding(organizationId);
        } catch (startErr) {
          console.error('Failed to start onboarding:', startErr);
          setError('Failed to initialize onboarding');
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();

    return () => {
      reset();
    };
  }, [organizationId]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  const handleResume = async () => {
    if (!organizationId) return;
    await resumeOnboarding(organizationId);
  };

  const handleStartOver = async () => {
    if (!organizationId) return;
    reset();
    await startOnboarding(organizationId);
    setCurrentStep(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (error || !organizationId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error || 'No organization selected'}</p>
        <Button onClick={() => navigate('/proposals')}>Back to Dashboard</Button>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={handleNext} />;
      case 1:
        return <BasicInfoStep organizationId={organizationId} onNext={handleNext} onPrev={handlePrev} />;
      case 2:
        return <MissionNeedsStep organizationId={organizationId} onNext={handleNext} onPrev={handlePrev} />;
      case 3:
        return <ProgramsStep organizationId={organizationId} onNext={handleNext} onPrev={handlePrev} />;
      case 4:
        return <CapacityStep organizationId={organizationId} onNext={handleNext} onPrev={handlePrev} />;
      case 5:
        return <ReviewStep organizationId={organizationId} onNext={handleNext} onPrev={handlePrev} />;
      case 6:
        return <SuccessStep organizationId={organizationId} />;
      default:
        return <div>Unknown step</div>;
    }
  };

  const showSidebar = currentStep > 0 && currentStep < 6;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Stepper - Only show after welcome */}
      {currentStep > 0 && currentStep < 6 && (
        <div className="bg-white border-b border-gray-200 py-6 px-8">
          <ProgressStepper
            currentStep={currentStep}
            completedSteps={[]}
            steps={STEPS.slice(1, 6)} // Skip Welcome and Complete
            onStepClick={handleStepClick}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        {/* Resume Prompt - Show if there's saved progress */}
        {progress && progress.currentStep > 0 && !progress.isComplete && currentStep === progress.currentStep && (
          <div className="mb-6">
            <ResumePrompt
              organizationId={organizationId}
              onResume={handleResume}
              onStartOver={handleStartOver}
            />
          </div>
        )}

        <div className={cn('grid gap-8', showSidebar ? 'grid-cols-3' : 'grid-cols-1')}>
          {/* Step Content */}
          <div className={cn(showSidebar ? 'col-span-2' : 'col-span-1')}>
            {renderStep()}
          </div>

          {/* Sidebar - Quality Meter */}
          {showSidebar && qualityScore && (
            <div className="col-span-1">
              <div className="sticky top-8">
                <QualityMeter score={qualityScore} size="medium" />

                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-sm text-blue-900 mb-2">💡 Why This Matters</h4>
                  <p className="text-xs text-blue-800">
                    The more context you provide, the better our AI can write compelling, personalized grant
                    proposals tailored to your mission and impact.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
