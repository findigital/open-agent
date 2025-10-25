import { Button, Input, Loading, Select, toast } from '@afk/component';
import { ArrowLeftIcon } from '@blocksuite/icons/rc';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { cn } from '@/lib/utils';
import { gql } from '@/lib/gql';
import { useProposalsStore } from '@/store/proposals';
import { useOrganizationOnboardingStore } from '@/store/organization-onboarding';

import { AutoSidebarPadding } from '../layout/auto-sidebar-padding';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  sections: Array<{
    id: string;
    title: string;
    description?: string;
    type: string;
    order: number;
    wordLimit?: number;
    required: boolean;
  }>;
}

const templateCategories = {
  foundation: { label: 'Foundation Grant', color: 'bg-blue-100 text-blue-700' },
  government: { label: 'Government Grant', color: 'bg-green-100 text-green-700' },
  corporate: { label: 'Corporate Sponsorship', color: 'bg-purple-100 text-purple-700' },
  research: { label: 'Research Grant', color: 'bg-orange-100 text-orange-700' },
};

const TemplateCard = ({
  template,
  selected,
  onSelect,
}: {
  template: Template;
  selected: boolean;
  onSelect: () => void;
}) => {
  const categoryInfo = templateCategories[template.category as keyof typeof templateCategories] || {
    label: template.category,
    color: 'bg-gray-100 text-gray-700',
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 border-2 rounded-lg transition-all',
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-base">{template.name}</h3>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('text-xs font-medium px-2 py-1 rounded', categoryInfo.color)}>
          {categoryInfo.label}
        </span>
        <span className="text-xs text-gray-500">{template.sections.length} sections</span>
      </div>
    </button>
  );
};

export const CreateProposal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrganization, currentWorkspaceId } = useProposalsStore();
  const { qualityScore, loadQualityScore, shouldShowBanner, dismissBanner } = useOrganizationOnboardingStore();

  const [step, setStep] = useState<'template' | 'details'>('template');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showBanner, setShowBanner] = useState(false);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [grantId, setGrantId] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Pre-populate grantId from URL if provided
  useEffect(() => {
    const grantIdFromUrl = searchParams.get('grantId');
    if (grantIdFromUrl) {
      setGrantId(grantIdFromUrl);
    }
  }, [searchParams]);

  // Load quality score on mount
  useEffect(() => {
    const loadScore = async () => {
      if (currentOrganization?.id) {
        try {
          await loadQualityScore(currentOrganization.id);
        } catch (error) {
          console.error('Failed to load quality score:', error);
        }
      }
    };
    loadScore();
  }, [currentOrganization?.id, loadQualityScore]);

  // Check if we should show banner
  useEffect(() => {
    if (qualityScore) {
      setShowBanner(shouldShowBanner('create_proposal'));
    }
  }, [qualityScore, shouldShowBanner]);

  // Load templates on mount
  useState(() => {
    const loadTemplates = async () => {
      if (!currentWorkspaceId) return;

      setLoadingTemplates(true);
      try {
        const res = await gql({
          query: `
            query GetTemplates($workspaceId: ID!) {
              proposalTemplates(workspaceId: $workspaceId) {
                id
                name
                description
                category
                sections {
                  id
                  title
                  description
                  type
                  order
                  wordLimit
                  required
                }
              }
            }
          `,
          variables: { workspaceId: currentWorkspaceId },
        });

        if (res.data?.proposalTemplates) {
          setTemplates(res.data.proposalTemplates);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
        toast.error('Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  });

  const handleDismissBanner = async () => {
    if (currentOrganization?.id) {
      await dismissBanner(currentOrganization.id, 'create_proposal');
      setShowBanner(false);
    }
  };

  const goToOnboarding = () => {
    if (currentOrganization?.id) {
      navigate(`/organization/onboarding?organizationId=${currentOrganization.id}`);
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !title.trim() || !currentWorkspaceId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await gql({
        query: `
          mutation CreateProposal($input: CreateProposalInput!) {
            createProposal(input: $input) {
              id
              title
              status
            }
          }
        `,
        variables: {
          input: {
            workspaceId: currentWorkspaceId,
            templateId: selectedTemplate,
            title: title.trim(),
            grantId: grantId || undefined,
            requestedAmount: requestedAmount ? parseFloat(requestedAmount) : undefined,
            dueDate: dueDate || undefined,
          },
        },
      });

      if (res.data?.createProposal) {
        toast.success('Proposal created successfully!');
        navigate(`/proposals/${res.data.createProposal.id}`);
      }
    } catch (error) {
      console.error('Failed to create proposal:', error);
      toast.error('Failed to create proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);

  return (
    <AutoSidebarPadding className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <button
          onClick={() => navigate('/proposals')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Proposals
        </button>
        <h1 className="text-2xl font-bold">Create New Proposal</h1>
        {currentOrganization && (
          <p className="text-sm text-gray-600 mt-1">{currentOrganization.name}</p>
        )}
      </div>

      {/* Onboarding Banner */}
      {showBanner && qualityScore && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                📊 Complete your organization profile for better proposals
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                AI-powered proposal writing works best with a complete profile. Takes 5-10 minutes.
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="bg-white/20 px-2 py-1 rounded">
                  Current quality: {qualityScore.overall}/100
                </span>
                {qualityScore.overall < 75 && (
                  <span className="text-blue-200">
                    Complete your profile to unlock AI recommendations
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={goToOnboarding}
                className="bg-white text-blue-600 hover:bg-blue-50"
                size="small"
              >
                Complete Profile
              </Button>
              <Button
                onClick={handleDismissBanner}
                variant="text"
                className="text-white hover:bg-white/10"
                size="small"
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step === 'template'
                  ? 'bg-blue-500 text-white'
                  : 'bg-green-500 text-white'
              )}
            >
              {step === 'details' ? '✓' : '1'}
            </div>
            <span className={step === 'template' ? 'font-medium' : 'text-gray-600'}>
              Choose Template
            </span>
          </div>
          <div className="flex-1 h-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step === 'details'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              )}
            >
              2
            </div>
            <span className={step === 'details' ? 'font-medium' : 'text-gray-600'}>
              Proposal Details
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {step === 'template' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">Select a Template</h2>
            <p className="text-sm text-gray-600 mb-6">
              Choose a template that best matches your grant opportunity
            </p>

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-12">
                <Loading className="text-2xl" />
                <span className="ml-3 text-gray-600">Loading templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No templates available</p>
                <p className="text-sm text-gray-500 mt-1">
                  Contact your administrator to add proposal templates
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    selected={selectedTemplate === template.id}
                    onSelect={() => setSelectedTemplate(template.id)}
                  />
                ))}
              </div>
            )}

            {selectedTemplateObj && (
              <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                <h3 className="font-semibold mb-3">Sections in this template:</h3>
                <ul className="space-y-2">
                  {selectedTemplateObj.sections
                    .sort((a, b) => a.order - b.order)
                    .map(section => (
                      <li key={section.id} className="flex items-start gap-2 text-sm">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <div>
                          <span className="font-medium">{section.title}</span>
                          {section.wordLimit && (
                            <span className="text-gray-500 ml-2">
                              ({section.wordLimit} words max)
                            </span>
                          )}
                          {section.description && (
                            <p className="text-gray-600 mt-0.5">{section.description}</p>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => navigate('/proposals')}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('details')}
                disabled={!selectedTemplate}
              >
                Next: Proposal Details
              </Button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-4">Proposal Details</h2>
            <p className="text-sm text-gray-600 mb-6">
              Provide basic information about your proposal
            </p>

            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proposal Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., EPA Environmental Education Grant Application"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grant ID (optional)
                </label>
                <Input
                  value={grantId}
                  onChange={e => setGrantId(e.target.value)}
                  placeholder="Link to a grant opportunity"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If you've found a grant in the grants database, enter its ID here
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested Amount (optional)
                </label>
                <Input
                  type="number"
                  value={requestedAmount}
                  onChange={e => setRequestedAmount(e.target.value)}
                  placeholder="50000"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date (optional)
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  min={dayjs().format('YYYY-MM-DD')}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-6">
              <Button variant="secondary" onClick={() => setStep('template')}>
                Back
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => navigate('/proposals')}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  loading={loading}
                  disabled={!title.trim()}
                >
                  Create Proposal
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AutoSidebarPadding>
  );
};
