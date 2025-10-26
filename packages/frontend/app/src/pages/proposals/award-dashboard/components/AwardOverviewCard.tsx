import { Button } from '@afk/component';
import dayjs from 'dayjs';
import { CheckCircleIcon, ClockIcon, AlertCircleIcon } from '@blocksuite/icons/rc';
import type { GrantAward } from '@/store/award';

interface AwardOverviewCardProps {
  award: GrantAward;
}

export const AwardOverviewCard = ({ award }: AwardOverviewCardProps) => {
  const daysUntilEnd = dayjs(award.projectEndDate).diff(dayjs(), 'days');
  const projectDuration = dayjs(award.projectEndDate).diff(dayjs(award.projectStartDate), 'days');
  const daysPassed = dayjs().diff(dayjs(award.projectStartDate), 'days');
  const progressPercent = Math.min(100, Math.max(0, (daysPassed / projectDuration) * 100));

  const pendingRequirements = award.requirements.filter(
    (r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS'
  ).length;
  const overdueRequirements = award.requirements.filter((r) => r.status === 'OVERDUE').length;
  const completedRequirements = award.requirements.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'APPROVED'
  ).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{award.proposal.title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {award.proposal.workspace.organization.name}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-green-600">
            ${award.awardAmount.toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 mt-1">Award Amount</p>
        </div>
      </div>

      {/* Project Timeline */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Project Timeline</span>
          <span className="font-medium text-gray-900">
            {daysUntilEnd > 0 ? `${daysUntilEnd} days remaining` : 'Project ended'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{dayjs(award.projectStartDate).format('MMM D, YYYY')}</span>
          <span>{dayjs(award.projectEndDate).format('MMM D, YYYY')}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Pending Requirements */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-900">Pending</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{pendingRequirements}</div>
          <div className="text-xs text-blue-700 mt-1">requirements</div>
        </div>

        {/* Overdue Requirements */}
        {overdueRequirements > 0 && (
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircleIcon className="w-5 h-5 text-red-600" />
              <span className="text-xs font-medium text-red-900">Overdue</span>
            </div>
            <div className="text-2xl font-bold text-red-900">{overdueRequirements}</div>
            <div className="text-xs text-red-700 mt-1">requirements</div>
          </div>
        )}

        {/* Completed Requirements */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <span className="text-xs font-medium text-green-900">Completed</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{completedRequirements}</div>
          <div className="text-xs text-green-700 mt-1">requirements</div>
        </div>
      </div>

      {/* Award Details */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Status:</span>
            <span className="ml-2 font-medium text-gray-900">{award.status}</span>
          </div>
          <div>
            <span className="text-gray-600">Awarded:</span>
            <span className="ml-2 font-medium text-gray-900">
              {dayjs(award.awardDate).format('MMM D, YYYY')}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Impact Reports:</span>
            <span className="ml-2 font-medium text-gray-900">{award.reports.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Communications:</span>
            <span className="ml-2 font-medium text-gray-900">{award.communications.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
