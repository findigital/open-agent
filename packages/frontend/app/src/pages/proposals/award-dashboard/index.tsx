import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button, Loading, toast } from '@afk/component';
import { SettingsIcon } from '@blocksuite/icons/rc';

import { useAwardStore } from '@/store/award';
import { AutoSidebarPadding } from '../../layout/auto-sidebar-padding';
import { AwardOverviewCard } from './components/AwardOverviewCard';
import { ComplianceCalendar } from './components/ComplianceCalendar';
import { UpcomingDeadlinesCard } from './components/UpcomingDeadlinesCard';
import { QuickActionsCard } from './components/QuickActionsCard';

export const AwardDashboard = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const { currentAward, loading, loadAward, error } = useAwardStore();

  useEffect(() => {
    if (proposalId) {
      loadAward(proposalId);
    }
  }, [proposalId, loadAward]);

  if (loading && !currentAward) {
    return (
      <AutoSidebarPadding>
        <div className="flex items-center justify-center min-h-screen">
          <Loading />
        </div>
      </AutoSidebarPadding>
    );
  }

  if (error && !currentAward) {
    return (
      <AutoSidebarPadding>
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Loading Award</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </AutoSidebarPadding>
    );
  }

  if (!currentAward) {
    return (
      <AutoSidebarPadding>
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">No Award Found</h2>
            <p className="text-gray-600 mb-6">
              This proposal has not been marked as awarded yet.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(`/proposals/${proposalId}`)}>
                View Proposal
              </Button>
              <Button onClick={() => navigate('/proposals')}>
                Back to Proposals
              </Button>
            </div>
          </div>
        </div>
      </AutoSidebarPadding>
    );
  }

  // Filter upcoming deadlines (next 30 days)
  const upcomingRequirements = currentAward.requirements
    .filter((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const handleCreateReport = () => {
    navigate(`/proposals/${proposalId}/award/impact-report/new`);
  };

  const handleDraftEmail = () => {
    toast.info('Email drafter coming soon!');
  };

  const handleUploadDocument = () => {
    navigate(`/proposals/documents`);
  };

  const handleAddRequirement = () => {
    toast.info('Add requirement modal coming soon!');
  };

  const handleRequirementClick = (requirement: any) => {
    toast.info(`Requirement details: ${requirement.title}`);
  };

  return (
    <AutoSidebarPadding>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Award Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Manage compliance, reporting, and communications
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/proposals/${proposalId}`)}
              >
                View Proposal
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info('Award settings coming soon!')}
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Award Overview */}
            <AwardOverviewCard award={currentAward} />

            {/* Compliance Calendar */}
            <ComplianceCalendar
              requirements={currentAward.requirements}
              onRequirementClick={handleRequirementClick}
            />
          </div>

          {/* Sidebar (1/3 width) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick Actions */}
            <QuickActionsCard
              onCreateReport={handleCreateReport}
              onDraftEmail={handleDraftEmail}
              onUploadDocument={handleUploadDocument}
              onAddRequirement={handleAddRequirement}
            />

            {/* Upcoming Deadlines */}
            <UpcomingDeadlinesCard
              requirements={upcomingRequirements}
              onRequirementClick={handleRequirementClick}
            />
          </div>
        </div>

        {/* Recent Communications Section (if any) */}
        {currentAward.communications && currentAward.communications.length > 0 && (
          <div className="mt-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Communications
              </h3>
              <div className="space-y-3">
                {currentAward.communications.slice(0, 3).map((comm) => (
                  <div
                    key={comm.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{comm.subject}</h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{comm.body}</p>
                      </div>
                      {comm.aiDrafted && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          AI
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AutoSidebarPadding>
  );
};
