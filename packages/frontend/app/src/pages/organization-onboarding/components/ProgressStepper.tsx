import { cn } from '@/lib/utils';
import { CheckIcon } from '@blocksuite/icons/rc';

interface Step {
  number: number;
  title: string;
  description: string;
}

interface ProgressStepperProps {
  currentStep: number;
  completedSteps: number[];
  steps: Step[];
  onStepClick?: (step: number) => void;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStep,
  completedSteps,
  steps,
  onStepClick,
}) => {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, stepIdx) => {
          const isCompleted = completedSteps.includes(step.number);
          const isCurrent = currentStep === step.number;
          const isClickable = onStepClick && (isCompleted || stepIdx <= currentStep);

          return (
            <li key={step.number} className="relative flex-1">
              {/* Connector Line */}
              {stepIdx !== steps.length - 1 && (
                <div className="absolute top-6 left-1/2 w-full h-0.5 -translate-y-1/2">
                  <div
                    className={cn(
                      'h-full transition-colors',
                      isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  />
                </div>
              )}

              {/* Step Circle */}
              <button
                onClick={() => isClickable && onStepClick?.(step.number)}
                disabled={!isClickable}
                className={cn(
                  'relative flex flex-col items-center group',
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <span
                  className={cn(
                    'relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all',
                    isCompleted
                      ? 'bg-blue-600 border-blue-600'
                      : isCurrent
                      ? 'bg-white border-blue-600'
                      : 'bg-white border-gray-300',
                    isClickable && !isCurrent && 'group-hover:border-blue-400'
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-6 h-6 text-white" />
                  ) : (
                    <span
                      className={cn(
                        'text-base font-semibold',
                        isCurrent ? 'text-blue-600' : 'text-gray-500'
                      )}
                    >
                      {step.number}
                    </span>
                  )}
                </span>

                <span className="mt-2 text-xs font-medium text-gray-900 text-center max-w-[100px]">
                  {step.title}
                </span>

                {isCurrent && (
                  <span className="absolute -bottom-6 text-[10px] text-gray-600 text-center max-w-[120px] leading-tight">
                    {step.description}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
