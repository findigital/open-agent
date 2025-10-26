import React, { useState } from 'react';
import { useImpactReportStore, ImpactReport } from '../../../../store/impact-report';

interface StepProps {
  report: ImpactReport | null;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
  autoSave: boolean;
}

export const StoriesStep: React.FC<StepProps> = ({ report, onNext }) => {
  const { updateReport } = useImpactReportStore();

  const [storiesOfImpact, setStoriesOfImpact] = useState(report?.storiesOfImpact || '');
  const [lessonsLearned, setLessonsLearned] = useState(report?.lessonsLearned || '');

  const handleContinue = async () => {
    if (report) {
      await updateReport(report.id, { storiesOfImpact, lessonsLearned });
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Impact Stories</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share compelling stories and lessons learned from your work.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Stories of Impact
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Share specific stories about individuals or communities impacted by your work.
          </p>
          <textarea
            rows={8}
            value={storiesOfImpact}
            onChange={(e) => setStoriesOfImpact(e.target.value)}
            placeholder="Tell a compelling story about your impact..."
            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Lessons Learned
          </label>
          <textarea
            rows={5}
            value={lessonsLearned}
            onChange={(e) => setLessonsLearned(e.target.value)}
            placeholder="What insights will guide your future work?"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <button
        onClick={handleContinue}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Continue to Documents
      </button>
    </div>
  );
};
