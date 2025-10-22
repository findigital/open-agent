import {
  Button,
  Loading,
  Menu,
  MenuItem,
  Select,
  toast,
} from '@afk/component';
import { MoreVerticalIcon, PageIcon } from '@blocksuite/icons/rc';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { cn } from '@/lib/utils';
import { type Proposal, useProposalsStore } from '@/store/proposals';

import { AutoSidebarPadding } from '../layout/auto-sidebar-padding';

const statusColors = {
  draft: 'text-gray-600',
  in_review: 'text-blue-600',
  approved: 'text-green-600',
  submitted: 'text-purple-600',
  awarded: 'text-emerald-600',
  rejected: 'text-red-600',
};

const statusLabels = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  submitted: 'Submitted',
  awarded: 'Awarded',
  rejected: 'Rejected',
};

const ProposalCard = ({ proposal }: { proposal: Proposal }) => {
  const navigate = useNavigate();
  const completedSections = proposal.sections.filter(s => s.completedAt).length;
  const totalSections = proposal.sections.length;
  const progress = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

  return (
    <div
      onClick={() => navigate(`/proposals/${proposal.id}`)}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 flex-1">
          <PageIcon className="w-5 h-5 mt-0.5 text-gray-500" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold truncate">{proposal.title}</h3>
            {proposal.grant && (
              <p className="text-sm text-gray-600 truncate">
                {proposal.grant.funderName}
              </p>
            )}
          </div>
        </div>
        <Menu
          items={
            <>
              <MenuItem>Edit</MenuItem>
              <MenuItem>Duplicate</MenuItem>
              <MenuItem className="text-red-600">Delete</MenuItem>
            </>
          }
        >
          <button
            onClick={e => {
              e.stopPropagation();
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVerticalIcon className="w-5 h-5" />
          </button>
        </Menu>
      </div>

      {/* Status & Progress */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              statusColors[proposal.status as keyof typeof statusColors] || 'text-gray-600'
            )}
            style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
          >
            {statusLabels[proposal.status as keyof typeof statusLabels] || proposal.status}
          </span>
          {proposal.requestedAmount && (
            <span className="text-xs text-gray-600">
              ${proposal.requestedAmount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>
              {completedSections} of {totalSections} sections
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{proposal.workspace.name}</span>
        {proposal.dueDate && (
          <span className={dayjs(proposal.dueDate).isBefore(dayjs()) ? 'text-red-600' : ''}>
            Due {dayjs(proposal.dueDate).format('MMM D, YYYY')}
          </span>
        )}
      </div>
    </div>
  );
};

const Empty = () => {
  return (
    <div className="size-full flex flex-col justify-center items-center">
      <PageIcon className="text-[97px] text-gray-300" />
      <span className="text-[15px] leading-[24px] font-medium mt-4">
        No proposals yet
      </span>
      <span className="text-sm leading-[22px] text-gray-500 mt-1">
        Create your first grant proposal to get started
      </span>
      <Link to="/proposals/new" className="mt-4">
        <Button>New Proposal</Button>
      </Link>
    </div>
  );
};

export const ProposalsDashboard = () => {
  const {
    proposals,
    organizations,
    currentOrganization,
    currentWorkspaceId,
    loading,
    initialized,
    refreshOrganizations,
    refreshProposals,
    setCurrentOrganization,
    setCurrentWorkspace,
  } = useProposalsStore();

  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');

  useEffect(() => {
    if (!initialized) {
      refreshOrganizations();
    }
  }, [initialized, refreshOrganizations]);

  // Set default organization and workspace
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      const firstOrg = organizations[0];
      setCurrentOrganization(firstOrg);
      if (firstOrg.workspaces.length > 0) {
        const firstWorkspace = firstOrg.workspaces[0];
        setCurrentWorkspace(firstWorkspace.id);
        refreshProposals(firstWorkspace.id);
      }
    }
  }, [organizations, currentOrganization, setCurrentOrganization, setCurrentWorkspace, refreshProposals]);

  const filteredProposals = useMemo(() => {
    if (!statusFilter || statusFilter === 'all') {
      return proposals;
    }
    return proposals.filter(p => p.status === statusFilter);
  }, [proposals, statusFilter]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const statusCounts = proposals.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const submitted = (statusCounts.submitted || 0) + (statusCounts.awarded || 0) + (statusCounts.rejected || 0);
    const awarded = statusCounts.awarded || 0;
    const successRate = submitted > 0 ? Math.round((awarded / submitted) * 100) : 0;

    const upcomingDeadlines = proposals
      .filter(p => p.dueDate && dayjs(p.dueDate).isAfter(dayjs()) && dayjs(p.dueDate).isBefore(dayjs().add(7, 'day')))
      .sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)));

    const totalRequested = proposals.reduce((sum, p) => sum + (p.requestedAmount || 0), 0);
    const totalAwarded = proposals
      .filter(p => p.status === 'awarded')
      .reduce((sum, p) => sum + (p.requestedAmount || 0), 0);

    return {
      statusCounts,
      successRate,
      upcomingDeadlines,
      totalRequested,
      totalAwarded,
    };
  }, [proposals]);

  const groupedProposals = useMemo(() => {
    const groups = {
      today: [] as Proposal[],
      yesterday: [] as Proposal[],
      thisWeek: [] as Proposal[],
      thisMonth: [] as Proposal[],
      older: [] as Proposal[],
    };

    filteredProposals.forEach(proposal => {
      const date = dayjs(proposal.updatedAt);
      if (date.isSame(dayjs(), 'day')) {
        groups.today.push(proposal);
      } else if (date.isSame(dayjs().subtract(1, 'day'), 'day')) {
        groups.yesterday.push(proposal);
      } else if (date.isSame(dayjs(), 'week')) {
        groups.thisWeek.push(proposal);
      } else if (date.isSame(dayjs(), 'month')) {
        groups.thisMonth.push(proposal);
      } else {
        groups.older.push(proposal);
      }
    });

    return groups;
  }, [filteredProposals]);

  return (
    <AutoSidebarPadding className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Proposals</h1>
            {currentOrganization && (
              <p className="text-sm text-gray-600 mt-1">{currentOrganization.name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link to="/proposals/grants">
              <Button variant="secondary">Find Grants</Button>
            </Link>
            <Link to="/proposals/documents">
              <Button variant="secondary">Documents</Button>
            </Link>
            <Link to="/proposals/new">
              <Button>New Proposal</Button>
            </Link>
          </div>
        </div>

        {/* Workspace & Status Selectors */}
        <div className="flex gap-3">
          <Select
            value={currentWorkspaceId || ''}
            onValueChange={value => {
              setCurrentWorkspace(value);
              refreshProposals(value);
            }}
            placeholder="Select workspace"
            className="w-64"
          >
            {currentOrganization?.workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter || 'all'}
            onValueChange={value => {
              const params = new URLSearchParams(searchParams);
              if (value === 'all') {
                params.delete('status');
              } else {
                params.set('status', value);
              }
              window.history.pushState({}, '', `?${params.toString()}`);
            }}
            placeholder="All statuses"
            className="w-48"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="submitted">Submitted</option>
            <option value="awarded">Awarded</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </div>

      {/* Analytics Section */}
      {proposals.length > 0 && !loading && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Proposals */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Proposals</h3>
                <PageIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold">{proposals.length}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {Object.entries(analytics.statusCounts).map(([status, count]) => (
                  <span key={status} className="text-xs text-gray-500">
                    {statusLabels[status as keyof typeof statusLabels]}: {count}
                  </span>
                ))}
              </div>
            </div>

            {/* Success Rate */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Success Rate</h3>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{analytics.successRate}%</div>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.statusCounts.awarded || 0} awarded of{' '}
                {(analytics.statusCounts.submitted || 0) + (analytics.statusCounts.awarded || 0) + (analytics.statusCounts.rejected || 0)} submitted
              </p>
            </div>

            {/* Funding Stats */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Funding</h3>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-2xl font-bold">${(analytics.totalAwarded / 1000).toFixed(0)}K</div>
              <p className="text-xs text-gray-500 mt-2">
                ${(analytics.totalRequested / 1000).toFixed(0)}K requested
              </p>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Next 7 Days</h3>
                <span className="text-2xl">⏰</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {analytics.upcomingDeadlines.length}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.upcomingDeadlines.length === 0
                  ? 'No upcoming deadlines'
                  : `Next: ${dayjs(analytics.upcomingDeadlines[0].dueDate).format('MMM D')}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading && !initialized ? (
          <div className="flex items-center justify-center h-full">
            <Loading className="text-2xl" />
            <span className="ml-3 text-gray-600">Loading proposals...</span>
          </div>
        ) : filteredProposals.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedProposals).map(([groupId, items]) => {
              if (items.length === 0) return null;
              const groupLabels: Record<string, string> = {
                today: 'Today',
                yesterday: 'Yesterday',
                thisWeek: 'This Week',
                thisMonth: 'This Month',
                older: 'Older',
              };
              return (
                <div key={groupId}>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">
                    {groupLabels[groupId]} · {items.length}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(proposal => (
                      <ProposalCard key={proposal.id} proposal={proposal} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AutoSidebarPadding>
  );
};
