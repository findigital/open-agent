import { Button } from '@afk/component';
import { useNavigate } from 'react-router';
import { useProposalsStore } from '@/store/proposals';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';
import { OrganizationSelector } from '@/components/organization-selector';
import { AutoSidebarPadding } from '../layout/auto-sidebar-padding';
import { useEffect, useState } from 'react';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useProposalsStore();
  const { qualityScore, loadQualityScore } = useOrganizationOnboardingStore();
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  useEffect(() => {
    if (currentOrganization?.id) {
      setSelectedOrgId(currentOrganization.id);
      loadQualityScore(currentOrganization.id);
    }
  }, [currentOrganization?.id, loadQualityScore]);

  const handleGoToOnboarding = () => {
    const orgId = selectedOrgId || currentOrganization?.id;
    if (orgId) {
      navigate(`/organization/onboarding?organizationId=${orgId}`);
    }
  };

  return (
    <AutoSidebarPadding className="h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Manage your account and organization settings</p>
      </div>

      <div className="p-6 max-w-4xl">
        {/* Organization Profile Section */}
        <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">Organization Profile</h2>
          <p className="text-sm text-gray-600 mb-4">
            Complete your organization profile to enable AI-powered proposal generation
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <OrganizationSelector
                value={selectedOrgId}
                onChange={(orgId) => {
                  setSelectedOrgId(orgId);
                  loadQualityScore(orgId);
                }}
                className="w-full max-w-md"
              />
            </div>

            {qualityScore && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Profile Quality</h3>
                    <p className="text-sm text-blue-700">
                      Your organization profile is {qualityScore.overall}% complete
                    </p>
                    {qualityScore.overall < 75 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Complete your profile to unlock AI recommendations and better proposals
                      </p>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {qualityScore.overall}%
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleGoToOnboarding}
              disabled={!selectedOrgId && !currentOrganization?.id}
            >
              {qualityScore && qualityScore.overall > 0
                ? 'Continue Organization Profile'
                : 'Start Organization Profile'}
            </Button>
          </div>
        </section>

        {/* Account Settings Section - Placeholder */}
        <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">Account Settings</h2>
          <p className="text-sm text-gray-600">Account preferences and security settings (coming soon)</p>
        </section>

        {/* Workspace Settings Section - Placeholder */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-1">Workspace Settings</h2>
          <p className="text-sm text-gray-600">Manage your workspaces and team members (coming soon)</p>
        </section>
      </div>
    </AutoSidebarPadding>
  );
};
