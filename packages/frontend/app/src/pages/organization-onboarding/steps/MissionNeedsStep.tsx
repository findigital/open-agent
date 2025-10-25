import { useState } from 'react';
import { Button, Input, toast } from '@afk/component';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';
import { DocumentUpload } from '../components/DocumentUpload';
import { cn } from '@/lib/utils';

interface MissionNeedsStepProps {
  organizationId: string;
  onNext: () => void;
  onPrev: () => void;
}

export const MissionNeedsStep: React.FC<MissionNeedsStepProps> = ({ organizationId, onNext, onPrev }) => {
  const { saveMission, saveNeeds, extractFromWebsite, extracting } = useOrganizationOnboardingStore();

  const [activeTab, setActiveTab] = useState<'mission' | 'needs'>('mission');
  const [importMethod, setImportMethod] = useState<'website' | 'document'>('website');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [missionData, setMissionData] = useState({
    mission: '',
    vision: '',
    values: [] as string[],
    focusAreas: [] as string[],
    geographicScope: '',
    targetPopulation: '',
  });

  const [needsData, setNeedsData] = useState({
    primaryNeed: '',
    needEvidence: [] as Array<{ statistic: string; source: string; year?: number }>,
    impactWithoutOrg: '',
    gapsInSolutions: '',
    uniqueApproach: '',
  });

  const [loading, setLoading] = useState(false);

  const handleExtractFromWebsite = async () => {
    if (!websiteUrl) {
      toast.error('Please enter a website URL');
      return;
    }

    try {
      const extracted = await extractFromWebsite(organizationId, websiteUrl);
      toast.success(`Extracted with ${Math.round(extracted.confidence * 100)}% confidence!`);

      // Pre-fill form with extracted data
      handleExtractionComplete(extracted);
    } catch (error) {
      toast.error('Failed to extract from website');
      console.error(error);
    }
  };

  const handleExtractionComplete = (extracted: any) => {
    // Pre-fill mission data
    if (extracted.mission) setMissionData((d) => ({ ...d, mission: extracted.mission! }));
    if (extracted.vision) setMissionData((d) => ({ ...d, vision: extracted.vision! }));
    if (extracted.focusAreas) setMissionData((d) => ({ ...d, focusAreas: extracted.focusAreas! }));
    if (extracted.geographicScope) setMissionData((d) => ({ ...d, geographicScope: extracted.geographicScope! }));
    if (extracted.targetPopulation) setMissionData((d) => ({ ...d, targetPopulation: extracted.targetPopulation! }));
    if (extracted.values) setMissionData((d) => ({ ...d, values: extracted.values! }));

    // Pre-fill needs data
    if (extracted.primaryNeed) setNeedsData((d) => ({ ...d, primaryNeed: extracted.primaryNeed! }));
    if (extracted.needEvidence) setNeedsData((d) => ({ ...d, needEvidence: extracted.needEvidence! }));
    if (extracted.uniqueApproach) setNeedsData((d) => ({ ...d, uniqueApproach: extracted.uniqueApproach! }));
    if (extracted.gapsInSolutions) setNeedsData((d) => ({ ...d, gapsInSolutions: extracted.gapsInSolutions! }));
    if (extracted.impactWithoutOrg) setNeedsData((d) => ({ ...d, impactWithoutOrg: extracted.impactWithoutOrg! }));
  };

  const handleNext = async () => {
    setLoading(true);

    try {
      await saveMission(organizationId, missionData);
      await saveNeeds(organizationId, needsData);
      toast.success('Mission and needs saved!');
      onNext();
    } catch (error) {
      toast.error('Failed to save');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Mission & Community Needs</h2>
      <p className="text-gray-600 mb-6">Tell us about your mission and the needs you address.</p>

      {/* Quick Import Section */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-sm text-blue-900 mb-3">🚀 Quick Import with AI</h3>

        {/* Import Method Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setImportMethod('website')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              importMethod === 'website'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-900 hover:bg-blue-100'
            )}
          >
            🌐 From Website
          </button>
          <button
            onClick={() => setImportMethod('document')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              importMethod === 'document'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-900 hover:bg-blue-100'
            )}
          >
            📄 From Document
          </button>
        </div>

        {/* Website Import */}
        {importMethod === 'website' && (
          <div>
            <div className="flex gap-2">
              <Input
                value={websiteUrl}
                onChange={setWebsiteUrl}
                placeholder="https://your-organization.org"
                className="flex-1"
              />
              <Button onClick={handleExtractFromWebsite} disabled={extracting} variant="primary">
                {extracting ? 'Extracting...' : 'Import'}
              </Button>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              AI will extract your mission, needs, and programs automatically from your website
            </p>
          </div>
        )}

        {/* Document Import */}
        {importMethod === 'document' && (
          <div>
            <DocumentUpload organizationId={organizationId} onExtractionComplete={handleExtractionComplete} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab('mission')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'mission'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            1. Mission & Identity
          </button>
          <button
            onClick={() => setActiveTab('needs')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'needs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            2. Community Needs & Gaps ⭐
          </button>
        </nav>
      </div>

      {/* Mission Tab */}
      {activeTab === 'mission' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mission Statement *</label>
            <textarea
              value={missionData.mission}
              onChange={(e) => setMissionData({ ...missionData, mission: e.target.value })}
              placeholder="What is your organization's core purpose?"
              className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px]"
              maxLength={500}
              required
            />
            <p className="text-xs text-gray-500 mt-1">{missionData.mission.length}/500 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vision Statement</label>
            <textarea
              value={missionData.vision}
              onChange={(e) => setMissionData({ ...missionData, vision: e.target.value })}
              placeholder="What future do you envision?"
              className="w-full border border-gray-300 rounded-lg p-3"
              maxLength={300}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Focus Areas *</label>
            <Input
              value={missionData.focusAreas.join(', ')}
              onChange={(val) => setMissionData({ ...missionData, focusAreas: val.split(',').map((s) => s.trim()) })}
              placeholder="Education, Youth Development, Health (comma-separated)"
            />
          </div>
        </div>
      )}

      {/* Needs Tab */}
      {activeTab === 'needs' && (
        <div className="space-y-6">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <p className="text-sm text-yellow-800">
              <strong>💡 Why this matters:</strong> Need statements are the foundation of every grant proposal.
              Specific, data-driven needs make your proposals much more compelling!
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Need/Problem Statement *
            </label>
            <textarea
              value={needsData.primaryNeed}
              onChange={(e) => setNeedsData({ ...needsData, primaryNeed: e.target.value })}
              placeholder="What critical need or gap does your organization address? Be specific and include data if available.

Example: 'In our county, 40% of students lack access to after-school programs, leading to increased juvenile delinquency rates and lower academic achievement.'"
              className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px]"
              maxLength={800}
              required
            />
            <p className="text-xs text-gray-500 mt-1">{needsData.primaryNeed.length}/800 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Unique Approach</label>
            <textarea
              value={needsData.uniqueApproach}
              onChange={(e) => setNeedsData({ ...needsData, uniqueApproach: e.target.value })}
              placeholder="How does your organization address this need differently or more effectively?"
              className="w-full border border-gray-300 rounded-lg p-3"
              maxLength={400}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gaps in Existing Solutions</label>
            <textarea
              value={needsData.gapsInSolutions}
              onChange={(e) => setNeedsData({ ...needsData, gapsInSolutions: e.target.value })}
              placeholder="What gaps do existing programs/services leave unfilled?"
              className="w-full border border-gray-300 rounded-lg p-3"
              maxLength={300}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
        <Button onClick={onPrev} variant="outline">
          Back
        </Button>
        <div className="flex gap-2">
          {activeTab === 'mission' && (
            <Button onClick={() => setActiveTab('needs')} variant="outline">
              Next: Community Needs
            </Button>
          )}
          {activeTab === 'needs' && (
            <Button onClick={handleNext} variant="primary" disabled={loading}>
              {loading ? 'Saving...' : 'Continue to Programs'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
