import { Button } from '@afk/component';
import dayjs from 'dayjs';
import { CalendarIcon, FileIcon, CheckCircleIcon, AlertCircleIcon } from '@blocksuite/icons/rc';
import type { ComplianceRequirement } from '@/store/award';
import { cn } from '@/lib/utils';

interface ComplianceCalendarProps {
  requirements: ComplianceRequirement[];
  onRequirementClick?: (requirement: ComplianceRequirement) => void;
}

const statusColors = {
  PENDING: 'bg-gray-100 text-gray-700 border-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-300',
  SUBMITTED: 'bg-purple-100 text-purple-700 border-purple-300',
  APPROVED: 'bg-green-100 text-green-700 border-green-300',
  NEEDS_REVISION: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  OVERDUE: 'bg-red-100 text-red-700 border-red-300',
};

const statusIcons = {
  PENDING: ClockIcon,
  IN_PROGRESS: FileIcon,
  SUBMITTED: FileIcon,
  APPROVED: CheckCircleIcon,
  NEEDS_REVISION: AlertCircleIcon,
  OVERDUE: AlertCircleIcon,
};

const requirementTypeLabels = {
  FINANCIAL_REPORT: 'Financial Report',
  PROGRESS_REPORT: 'Progress Report',
  IMPACT_REPORT: 'Impact Report',
  AUDIT: 'Audit',
  DOCUMENT_SUBMISSION: 'Document Submission',
  SITE_VISIT: 'Site Visit',
  OTHER: 'Other',
};

export const ComplianceCalendar = ({ requirements, onRequirementClick }: ComplianceCalendarProps) => {
  // Sort requirements by due date
  const sortedRequirements = [...requirements].sort((a, b) =>
    dayjs(a.dueDate).diff(dayjs(b.dueDate))
  );

  // Group by month
  const groupedByMonth = sortedRequirements.reduce((acc, req) => {
    const month = dayjs(req.dueDate).format('MMMM YYYY');
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(req);
    return acc;
  }, {} as Record<string, ComplianceRequirement[]>);

  if (requirements.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Compliance Requirements</h3>
          <p className="text-sm text-gray-600">
            Add compliance requirements to track deadlines and submissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Compliance Calendar</h3>
        <CalendarIcon className="w-5 h-5 text-gray-500" />
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByMonth).map(([month, reqs]) => (
          <div key={month}>
            <h4 className="text-sm font-medium text-gray-700 mb-3">{month}</h4>
            <div className="space-y-2">
              {reqs.map((req) => {
                const Icon = statusIcons[req.status as keyof typeof statusIcons] || FileIcon;
                const daysUntilDue = dayjs(req.dueDate).diff(dayjs(), 'days');
                const isOverdue = daysUntilDue < 0;
                const isUpcoming = daysUntilDue >= 0 && daysUntilDue <= 7;

                return (
                  <div
                    key={req.id}
                    onClick={() => onRequirementClick?.(req)}
                    className={cn(
                      'border rounded-lg p-3 transition-all cursor-pointer hover:shadow-md',
                      statusColors[req.status as keyof typeof statusColors] || statusColors.PENDING
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h5 className="font-medium text-sm truncate">{req.title}</h5>
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
                              isOverdue
                                ? 'bg-red-100 text-red-700'
                                : isUpcoming
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {isOverdue
                              ? `${Math.abs(daysUntilDue)}d overdue`
                              : daysUntilDue === 0
                              ? 'Due today'
                              : `${daysUntilDue}d left`}
                          </span>
                        </div>
                        <p className="text-xs opacity-80 line-clamp-1">{req.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="opacity-80">
                            {requirementTypeLabels[req.type as keyof typeof requirementTypeLabels] || req.type}
                          </span>
                          <span className="opacity-80">•</span>
                          <span className="opacity-80">
                            Due {dayjs(req.dueDate).format('MMM D, YYYY')}
                          </span>
                          {req.documents && req.documents.length > 0 && (
                            <>
                              <span className="opacity-80">•</span>
                              <span className="opacity-80">{req.documents.length} docs</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
