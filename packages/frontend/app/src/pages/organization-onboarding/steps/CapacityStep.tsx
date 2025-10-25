import { useState } from 'react';
import { Button, Input, toast } from '@afk/component';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';

interface CapacityStepProps {
  organizationId: string;
  onNext: () => void;
  onPrev: () => void;
}

interface CapacityData {
  staffCount?: number;
  fullTimeStaff?: number;
  partTimeStaff?: number;
  volunteers?: number;
  boardCount?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  programExpensePct?: number;
  adminExpensePct?: number;
}

export const CapacityStep: React.FC<CapacityStepProps> = ({ organizationId, onNext, onPrev }) => {
  const { saveCapacity, qualityScore } = useOrganizationOnboardingStore();

  const [capacityData, setCapacityData] = useState<CapacityData>({
    staffCount: undefined,
    fullTimeStaff: undefined,
    partTimeStaff: undefined,
    volunteers: undefined,
    boardCount: undefined,
    totalRevenue: undefined,
    totalExpenses: undefined,
    programExpensePct: undefined,
    adminExpensePct: undefined,
  });

  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof CapacityData, value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    setCapacityData({ ...capacityData, [field]: numValue });
  };

  const handleNext = async () => {
    setLoading(true);

    try {
      // Filter out undefined values
      const dataToSave = Object.fromEntries(
        Object.entries(capacityData).filter(([_, value]) => value !== undefined)
      );

      await saveCapacity(organizationId, dataToSave);
      toast.success('Capacity information saved!');
      onNext();
    } catch (error) {
      toast.error('Failed to save capacity information');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Organizational Capacity</h2>
      <p className="text-gray-600 mb-6">Tell us about your team, board, and financial resources.</p>

      {/* Help text */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>💡 Tip:</strong> This information helps funders understand your organization's stability and ability to
          execute programs effectively. Most fields are optional.
        </p>
      </div>

      <div className="space-y-8">
        {/* Staffing Section */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Team & Staff</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Staff Count</label>
              <Input
                type="number"
                value={capacityData.staffCount?.toString() || ''}
                onChange={(value) => updateField('staffCount', value)}
                placeholder="e.g., 15"
              />
              <p className="text-xs text-gray-500 mt-1">Total number of paid staff members</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Board Members</label>
              <Input
                type="number"
                value={capacityData.boardCount?.toString() || ''}
                onChange={(value) => updateField('boardCount', value)}
                placeholder="e.g., 12"
              />
              <p className="text-xs text-gray-500 mt-1">Number of board members</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full-Time Staff</label>
              <Input
                type="number"
                value={capacityData.fullTimeStaff?.toString() || ''}
                onChange={(value) => updateField('fullTimeStaff', value)}
                placeholder="e.g., 10"
              />
              <p className="text-xs text-gray-500 mt-1">Full-time employees</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Part-Time Staff</label>
              <Input
                type="number"
                value={capacityData.partTimeStaff?.toString() || ''}
                onChange={(value) => updateField('partTimeStaff', value)}
                placeholder="e.g., 5"
              />
              <p className="text-xs text-gray-500 mt-1">Part-time employees</p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Active Volunteers</label>
              <Input
                type="number"
                value={capacityData.volunteers?.toString() || ''}
                onChange={(value) => updateField('volunteers', value)}
                placeholder="e.g., 50"
              />
              <p className="text-xs text-gray-500 mt-1">Number of active volunteers (annually)</p>
            </div>
          </div>
        </div>

        {/* Financial Section */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Financial Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Annual Revenue ($)</label>
              <Input
                type="number"
                value={capacityData.totalRevenue?.toString() || ''}
                onChange={(value) => updateField('totalRevenue', value)}
                placeholder="e.g., 750000"
              />
              <p className="text-xs text-gray-500 mt-1">Most recent fiscal year</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Annual Expenses ($)</label>
              <Input
                type="number"
                value={capacityData.totalExpenses?.toString() || ''}
                onChange={(value) => updateField('totalExpenses', value)}
                placeholder="e.g., 680000"
              />
              <p className="text-xs text-gray-500 mt-1">Most recent fiscal year</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program Expenses (%)</label>
              <Input
                type="number"
                value={capacityData.programExpensePct?.toString() || ''}
                onChange={(value) => updateField('programExpensePct', value)}
                placeholder="e.g., 75"
                max={100}
              />
              <p className="text-xs text-gray-500 mt-1">Percentage of budget spent on programs</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Expenses (%)</label>
              <Input
                type="number"
                value={capacityData.adminExpensePct?.toString() || ''}
                onChange={(value) => updateField('adminExpensePct', value)}
                placeholder="e.g., 15"
                max={100}
              />
              <p className="text-xs text-gray-500 mt-1">Percentage of budget spent on admin/overhead</p>
            </div>
          </div>

          {/* Budget breakdown helper */}
          {capacityData.totalRevenue && capacityData.totalExpenses && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-semibold ml-2">${capacityData.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Expenses:</span>
                    <span className="font-semibold ml-2">${capacityData.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Net:</span>
                    <span
                      className={`font-semibold ml-2 ${
                        capacityData.totalRevenue - capacityData.totalExpenses >= 0
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}
                    >
                      ${(capacityData.totalRevenue - capacityData.totalExpenses).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Staffing ratio helper */}
        {capacityData.staffCount && capacityData.totalRevenue && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-900">
              <strong>Revenue per staff member:</strong> $
              {Math.round(capacityData.totalRevenue / capacityData.staffCount).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
        <Button onClick={onPrev} variant="outline" disabled={loading}>
          Back
        </Button>
        <div className="text-sm text-gray-600">
          {qualityScore && `Quality Score: ${qualityScore.overall}/100`}
        </div>
        <Button onClick={handleNext} variant="primary" disabled={loading}>
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};
