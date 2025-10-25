import { Button } from '@afk/component';

interface ProgramsStepProps {
  organizationId: string;
  onNext: () => void;
  onPrev: () => void;
}

export const ProgramsStep: React.FC<ProgramsStepProps> = ({ onNext, onPrev }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Programs & Services</h2>
      <p className="text-gray-600 mb-8">Add information about your programs and their impact.</p>

      <div className="text-center py-12 text-gray-500">
        <p>Programs step - Coming soon!</p>
        <p className="text-sm mt-2">This step will capture program-specific needs and outcomes.</p>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button onClick={onPrev} variant="outline">
          Back
        </Button>
        <Button onClick={onNext} variant="primary">
          Continue
        </Button>
      </div>
    </div>
  );
};
