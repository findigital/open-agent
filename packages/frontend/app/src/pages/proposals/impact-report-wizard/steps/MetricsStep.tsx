import React, { useState, useEffect } from 'react';
import { useImpactReportStore, ImpactReport } from '../../../../store/impact-report';

interface StepProps {
  report: ImpactReport | null;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
  autoSave: boolean;
}

export const MetricsStep: React.FC<StepProps> = ({ report, onNext, autoSave }) => {
  const { updateReport } = useImpactReportStore();

  const [peopleServed, setPeopleServed] = useState(report?.peopleServed || 0);
  const [programsDelivered, setProgramsDelivered] = useState(report?.programsDelivered || 0);

  // Auto-save logic
  useEffect(() => {
    if (!report || !autoSave) return;

    const timer = setTimeout(async () => {
      await updateReport(report.id, { peopleServed, programsDelivered });
    }, 1000);

    return () => clearTimeout(timer);
  }, [peopleServed, programsDelivered, autoSave, report, updateReport]);

  const handleContinue = async () => {
    if (report) {
      await updateReport(report.id, { peopleServed, programsDelivered });
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Impact Metrics</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter quantitative data about your program's reach and delivery.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            People Served
          </label>
          <input
            type="number"
            min="0"
            value={peopleServed}
            onChange={(e) => setPeopleServed(parseInt(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Programs Delivered
          </label>
          <input
            type="number"
            min="0"
            value={programsDelivered}
            onChange={(e) => setProgramsDelivered(parseInt(e.target.value) || 0)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <button
        onClick={handleContinue}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Continue to Narratives
      </button>
    </div>
  );
};
