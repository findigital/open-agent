import React, { useState } from 'react';
import { useImpactReportStore, ImpactReport } from '../../../../store/impact-report';
import { useParams } from 'react-router-dom';

interface StepProps {
  report: ImpactReport | null;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
  autoSave: boolean;
}

export const SetupStep: React.FC<StepProps> = ({ report, onNext }) => {
  const { awardId } = useParams<{ awardId: string }>();
  const { createReport, updateReport } = useImpactReportStore();

  const [periodStart, setPeriodStart] = useState(report?.reportingPeriodStart || '');
  const [periodEnd, setPeriodEnd] = useState(report?.reportingPeriodEnd || '');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      if (!report && awardId) {
        await createReport({
          awardId,
          reportingPeriodStart: periodStart,
          reportingPeriodEnd: periodEnd,
        });
      } else if (report) {
        await updateReport(report.id, {
          reportingPeriodStart: periodStart,
          reportingPeriodEnd: periodEnd,
        });
      }
      onNext();
    } catch (error) {
      console.error('Failed to save setup:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Report Setup</h2>
        <p className="mt-1 text-sm text-gray-500">
          Define the reporting period for this impact report.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Period Start
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Period End
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            required
          />
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!periodStart || !periodEnd || loading}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Continue to Metrics'}
      </button>
    </div>
  );
};
