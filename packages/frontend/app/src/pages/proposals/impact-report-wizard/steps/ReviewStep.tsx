import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useImpactReportStore, ImpactReport } from '../../../../store/impact-report';

interface StepProps {
  report: ImpactReport | null;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
  autoSave: boolean;
}

export const ReviewStep: React.FC<StepProps> = ({ report }) => {
  const navigate = useNavigate();
  const { proposalId } = useParams<{ proposalId: string }>();
  const { submitReport, generateSummary } = useImpactReportStore();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateSummary = async () => {
    if (!report) return;

    setGenerating(true);
    try {
      await generateSummary(report.id);
      alert('AI summary generated successfully!');
    } catch (error) {
      alert('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!report) return;

    setSubmitting(true);
    try {
      await submitReport({
        reportId: report.id,
        recipientEmail: recipientEmail || undefined,
        message: message || undefined,
      });

      alert('Impact report submitted successfully!');
      navigate(`/proposals/${proposalId}/award`);
    } catch (error: any) {
      alert(error.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!report) {
    return <div>No report data available</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Review & Submit</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review your impact report and submit when ready.
        </p>
      </div>

      {/* Quality Score */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">Report Quality</h3>
            <p className="text-xs text-blue-700 mt-1">
              Based on completeness and depth
            </p>
          </div>
          <div className={`text-3xl font-bold ${
            (report.qualityScore || 0) >= 80
              ? 'text-green-600'
              : (report.qualityScore || 0) >= 60
              ? 'text-yellow-600'
              : 'text-red-600'
          }`}>
            {report.qualityScore || 0}%
          </div>
        </div>
      </div>

      {/* Summary */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">AI-Generated Summary</h3>
          <button
            onClick={handleGenerateSummary}
            disabled={generating}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : '✨ Generate Summary'}
          </button>
        </div>
        {report.aiGeneratedSummary ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
            {report.aiGeneratedSummary}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500 italic">
            No summary generated yet. Click "Generate Summary" to create one.
          </div>
        )}
      </div>

      {/* Report Details */}
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase">Reporting Period</h4>
          <p className="mt-1 text-sm text-gray-900">
            {new Date(report.reportingPeriodStart).toLocaleDateString()} - {new Date(report.reportingPeriodEnd).toLocaleDateString()}
          </p>
        </div>

        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase">Metrics</h4>
          <p className="mt-1 text-sm text-gray-900">
            {report.peopleServed || 0} people served • {report.programsDelivered || 0} programs delivered
          </p>
        </div>

        {report.challenges && (
          <div className="p-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase">Challenges</h4>
            <p className="mt-1 text-sm text-gray-700 line-clamp-3">{report.challenges}</p>
          </div>
        )}

        {report.successes && (
          <div className="p-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase">Successes</h4>
            <p className="mt-1 text-sm text-gray-700 line-clamp-3">{report.successes}</p>
          </div>
        )}
      </div>

      {/* Submission Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Program Officer Email (Optional)
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="officer@foundation.org"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Message (Optional)
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal message with your submission..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !report.peopleServed || !report.successes}
        className="w-full px-4 py-3 text-base font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit Impact Report'}
      </button>

      {(!report.peopleServed || !report.successes) && (
        <p className="text-sm text-red-600 text-center">
          Please complete metrics and successes sections before submitting
        </p>
      )}
    </div>
  );
};
