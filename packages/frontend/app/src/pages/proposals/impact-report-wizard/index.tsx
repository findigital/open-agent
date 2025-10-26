import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useImpactReportStore } from '../../../store/impact-report';
import { useAwardStore } from '../../../store/award';
import { SetupStep } from './steps/SetupStep';
import { MetricsStep } from './steps/MetricsStep';
import { NarrativesStep } from './steps/NarrativesStep';
import { StoriesStep } from './steps/StoriesStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { ReviewStep } from './steps/ReviewStep';

/**
 * Wizard Steps
 */
const STEPS = [
  { id: 'setup', title: 'Setup', component: SetupStep },
  { id: 'metrics', title: 'Metrics', component: MetricsStep },
  { id: 'narratives', title: 'Narratives', component: NarrativesStep },
  { id: 'stories', title: 'Impact Stories', component: StoriesStep },
  { id: 'documents', title: 'Documents', component: DocumentsStep },
  { id: 'review', title: 'Review & Submit', component: ReviewStep },
] as const;

/**
 * Impact Report Wizard
 *
 * Multi-step wizard for creating and editing impact reports.
 * Supports draft saving, AI enhancement, and guided completion.
 */
export const ImpactReportWizard: React.FC = () => {
  const { proposalId, awardId } = useParams<{ proposalId: string; awardId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reportId = searchParams.get('reportId');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const { currentReport, currentAward, loading, loadReport, loadAward } = useImpactReportStore();
  const { loadAward: loadAwardInfo } = useAwardStore();

  // Load report if editing
  useEffect(() => {
    if (reportId) {
      loadReport(reportId);
    }
  }, [reportId, loadReport]);

  // Load award info
  useEffect(() => {
    if (awardId) {
      loadAwardInfo(proposalId!);
    }
  }, [awardId, proposalId, loadAwardInfo]);

  const currentStep = STEPS[currentStepIndex];
  const StepComponent = currentStep.component;

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancel = () => {
    navigate(`/proposals/${proposalId}/award`);
  };

  if (loading && !currentReport) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {currentReport ? 'Edit Impact Report' : 'New Impact Report'}
              </h1>
              {currentAward && (
                <p className="text-sm text-gray-500 mt-1">
                  {currentAward.proposal?.title}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {/* Quality Score */}
              {currentReport?.qualityScore !== undefined && (
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-500">Quality:</div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentReport.qualityScore >= 80
                      ? 'bg-green-100 text-green-800'
                      : currentReport.qualityScore >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {currentReport.qualityScore}%
                  </div>
                </div>
              )}

              {/* Auto-save Toggle */}
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Auto-save</span>
              </label>

              {/* Status Badge */}
              {currentReport && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  currentReport.status === 'SUBMITTED'
                    ? 'bg-green-100 text-green-800'
                    : currentReport.status === 'IN_REVIEW'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {currentReport.status}
                </span>
              )}
            </div>
          </div>

          {/* Step Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center flex-1">
                    <button
                      onClick={() => setCurrentStepIndex(index)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        index === currentStepIndex
                          ? 'bg-blue-600 text-white'
                          : index < currentStepIndex
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {index < currentStepIndex ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </button>
                    <div className={`mt-2 text-xs font-medium ${
                      index === currentStepIndex
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-6 ${
                      index < currentStepIndex
                        ? 'bg-green-600'
                        : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <StepComponent
            report={currentReport}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onCancel={handleCancel}
            autoSave={autoSaveEnabled}
          />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Previous
              </button>
            )}

            {currentStepIndex < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={() => {
                  // Submit logic handled in ReviewStep
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled
              >
                Submit in Review Step
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Padding for fixed footer */}
      <div className="h-20" />
    </div>
  );
};
