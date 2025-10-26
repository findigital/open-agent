import React, { useState } from 'react';
import { useImpactReportStore, ImpactReport } from '../../../../store/impact-report';

interface StepProps {
  report: ImpactReport | null;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
  autoSave: boolean;
}

export const NarrativesStep: React.FC<StepProps> = ({ report, onNext }) => {
  const { updateReport, enhanceNarrative } = useImpactReportStore();

  const [challenges, setChallenges] = useState(report?.challenges || '');
  const [successes, setSuccesses] = useState(report?.successes || '');
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = async (section: 'challenges' | 'successes') => {
    if (!report) return;

    setEnhancing(true);
    try {
      const result = await enhanceNarrative({
        reportId: report.id,
        section,
        currentText: section === 'challenges' ? challenges : successes,
      });

      // Show AI suggestions
      console.log('AI Suggestions:', result.suggestions);
      alert(`AI Suggestions:\n\n${result.suggestions.join('\n\n')}`);
    } catch (error) {
      console.error('Enhancement failed:', error);
    } finally {
      setEnhancing(false);
    }
  };

  const handleContinue = async () => {
    if (report) {
      await updateReport(report.id, { challenges, successes });
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Narratives</h2>
        <p className="mt-1 text-sm text-gray-500">
          Describe the challenges faced and successes achieved during this period.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Challenges
            </label>
            <button
              onClick={() => handleEnhance('challenges')}
              disabled={enhancing || !challenges}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              ✨ Enhance with AI
            </button>
          </div>
          <textarea
            rows={6}
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            placeholder="Describe the challenges your organization faced..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Successes
            </label>
            <button
              onClick={() => handleEnhance('successes')}
              disabled={enhancing || !successes}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              ✨ Enhance with AI
            </button>
          </div>
          <textarea
            rows={6}
            value={successes}
            onChange={(e) => setSuccesses(e.target.value)}
            placeholder="Describe your key successes and achievements..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <button
        onClick={handleContinue}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Continue to Impact Stories
      </button>
    </div>
  );
};
