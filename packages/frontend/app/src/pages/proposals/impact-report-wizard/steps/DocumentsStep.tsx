import React from 'react';
import { ImpactReport } from '../../../../store/impact-report';

interface StepProps {
  report: ImpactReport | null;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
  autoSave: boolean;
}

export const DocumentsStep: React.FC<StepProps> = ({ report, onNext }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Supporting Documents</h2>
        <p className="mt-1 text-sm text-gray-500">
          Attach photos, reports, and other supporting materials.
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-sm text-gray-600">
          Document attachment feature coming soon
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Photos, PDFs, spreadsheets
        </p>
      </div>

      {report?.documents && report.documents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Attached Documents</h3>
          {report.documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <span className="text-sm text-gray-700">{doc.document?.filename}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
      >
        Continue to Review
      </button>
    </div>
  );
};
