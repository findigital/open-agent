import { Button } from '@afk/component';

interface CapacityStepProps {
  organizationId: string;
  onNext: () => void;
  onPrev: () => void;
}

export const CapacityStep: React.FC<CapacityStepProps> = ({ onNext, onPrev }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Organizational Capacity</h2>
      <p className="text-gray-600 mb-8">Tell us about your team and resources.</p>

      <div className="text-center py-12 text-gray-500">
        <p>Capacity step - Coming soon!</p>
        <p className="text-sm mt-2">This step will capture staff, board, and financial information.</p>
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
