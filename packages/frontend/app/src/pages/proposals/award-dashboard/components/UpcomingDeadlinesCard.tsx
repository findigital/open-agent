import dayjs from 'dayjs';
import { ClockIcon, AlertCircleIcon } from '@blocksuite/icons/rc';
import type { ComplianceRequirement } from '@/store/award';
import { cn } from '@/lib/utils';

interface UpcomingDeadlinesCardProps {
  requirements: ComplianceRequirement[];
  onRequirementClick?: (requirement: ComplianceRequirement) => void;
}

export const UpcomingDeadlinesCard = ({ requirements, onRequirementClick }: UpcomingDeadlinesCardProps) => {
  if (requirements.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Upcoming Deadlines</h3>
        <div className="text-center py-4">
          <ClockIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-600">No upcoming deadlines</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Upcoming Deadlines</h3>
      <div className="space-y-2">
        {requirements.map((req) => {
          const daysUntilDue = dayjs(req.dueDate).diff(dayjs(), 'days');
          const isUrgent = daysUntilDue <= 3;

          return (
            <div
              key={req.id}
              onClick={() => onRequirementClick?.(req)}
              className={cn(
                'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
                isUrgent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
              )}
            >
              <div className="flex items-start gap-2">
                {isUrgent ? (
                  <AlertCircleIcon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <ClockIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    'text-sm font-medium truncate',
                    isUrgent ? 'text-red-900' : 'text-gray-900'
                  )}>
                    {req.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      'text-xs font-medium',
                      isUrgent ? 'text-red-700' : 'text-gray-700'
                    )}>
                      {daysUntilDue === 0
                        ? 'Due today'
                        : daysUntilDue === 1
                        ? 'Due tomorrow'
                        : `${daysUntilDue} days left`}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-600">
                      {dayjs(req.dueDate).format('MMM D')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
