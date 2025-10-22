import {
  Button,
  IconButton,
  Loading,
  ScrollableContainer,
  toast,
} from '@afk/component';
import { ArrowLeftIcon, CheckIcon, MoreVerticalIcon } from '@blocksuite/icons/rc';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { cn } from '@/lib/utils';
import { gql } from '@/lib/gql';
import { useProposalsStore } from '@/store/proposals';

import { AutoSidebarPadding } from '../layout/auto-sidebar-padding';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  in_review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  submitted: 'bg-purple-100 text-purple-700',
  awarded: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

interface SectionEditorProps {
  section: {
    id: string;
    title: string;
    content: string;
    type: string;
    wordLimit?: number;
  };
  proposalId: string;
  onGenerate: (sectionId: string) => void;
  generating: boolean;
}

const SectionEditor = ({ section, proposalId, onGenerate, generating }: SectionEditorProps) => {
  const [content, setContent] = useState(section.content);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wordCount = content.trim().split(/\s+/).length;
  const isOverLimit = section.wordLimit && wordCount > section.wordLimit;

  // Update local content when section changes
  useEffect(() => {
    setContent(section.content);
    setSaveStatus('saved');
  }, [section.content]);

  // Auto-save with debounce
  useEffect(() => {
    // Don't auto-save if content hasn't changed
    if (content === section.content) return;

    setSaveStatus('unsaved');

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after user stops typing)
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');

      try {
        await gql({
          query: `
            mutation UpdateProposalSection($sectionId: ID!, $content: String!) {
              updateProposalSection(sectionId: $sectionId, content: $content) {
                id
                content
                updatedAt
              }
            }
          `,
          variables: {
            sectionId: section.id,
            content: content,
          },
        });

        setSaveStatus('saved');
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('unsaved');
        toast.error('Failed to save changes');
      }
    }, 2000);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, section.content, section.id]);

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      {/* Section Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{section.title}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500">Type: {section.type}</span>
            {section.wordLimit && (
              <span
                className={cn(
                  'text-xs',
                  isOverLimit ? 'text-red-600 font-medium' : 'text-gray-500'
                )}
              >
                {wordCount} / {section.wordLimit} words
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={() => onGenerate(section.id)}
          loading={generating}
          size="small"
          variant="primary"
        >
          {content.trim() ? 'Regenerate' : 'Generate'} with AI
        </Button>
      </div>

      {/* Content Editor */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={`Write your ${section.title.toLowerCase()} here, or use AI to generate content...`}
        className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-base"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      />

      {/* Save Status Indicator */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-xs">
          {saveStatus === 'saving' && (
            <>
              <Loading className="text-sm" />
              <span className="text-gray-500">Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckIcon className="w-4 h-4 text-green-600" />
              <span className="text-gray-500">All changes saved</span>
            </>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-orange-600 font-medium">Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
};

const AIAssistantPanel = ({
  proposalId,
  sectionId,
  onGenerate,
  generating,
}: {
  proposalId: string;
  sectionId?: string;
  onGenerate: (sectionId: string, guidance?: string) => Promise<void>;
  generating: boolean;
}) => {
  const [guidance, setGuidance] = useState('');
  const [showChat, setShowChat] = useState(false);

  const quickActions = [
    { label: 'Emphasize impact', guidance: 'Focus on measurable outcomes and community impact' },
    { label: 'Add metrics', guidance: 'Include specific data points and success metrics' },
    { label: 'More concise', guidance: 'Make the content more concise while retaining key points' },
    { label: 'Formal tone', guidance: 'Use a more formal and professional tone' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold mb-3">AI Assistant</h3>

      {/* Quick Actions */}
      <div className="space-y-2 mb-4">
        <p className="text-xs text-gray-600 mb-2">Quick improvements:</p>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map(action => (
            <Button
              key={action.label}
              size="small"
              variant="secondary"
              onClick={() => {
                if (sectionId) {
                  onGenerate(sectionId, action.guidance);
                }
              }}
              disabled={!sectionId || generating}
              className="text-xs"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Guidance */}
      <div className="space-y-2">
        <label className="text-xs text-gray-600">Custom guidance:</label>
        <textarea
          value={guidance}
          onChange={e => setGuidance(e.target.value)}
          placeholder="E.g., 'Emphasize our 10-year track record'"
          className="w-full h-20 p-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button
          onClick={() => {
            if (sectionId && guidance.trim()) {
              onGenerate(sectionId, guidance);
              setGuidance('');
            }
          }}
          disabled={!sectionId || !guidance.trim() || generating}
          className="w-full"
          size="small"
        >
          Generate with Guidance
        </Button>
      </div>

      {/* Chat Toggle (placeholder for future) */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="w-full mt-3 text-sm text-blue-600 hover:underline"
      >
        {showChat ? 'Hide' : 'Show'} AI Chat
      </button>

      {showChat && (
        <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600">
          AI chat interface coming soon...
        </div>
      )}
    </div>
  );
};

export const ProposalEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProposal, loading, loadProposal, generateSection } = useProposalsStore();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (id) {
      loadProposal(id);
    }
  }, [id, loadProposal]);

  useEffect(() => {
    if (currentProposal && !activeSectionId && currentProposal.sections.length > 0) {
      setActiveSectionId(currentProposal.sections[0].id);
    }
  }, [currentProposal, activeSectionId]);

  const handleGenerate = useCallback(
    async (sectionId: string, userGuidance?: string) => {
      if (!id) return;

      setGenerating(true);
      try {
        const result = await generateSection({
          proposalId: id,
          sectionId,
          userGuidance,
        });

        toast.success(`Section generated successfully! (${result.wordCount} words)`);
        if (result.suggestions && result.suggestions.length > 0) {
          console.log('AI suggestions:', result.suggestions);
        }
      } catch (error) {
        toast.error('Failed to generate section. Please try again.');
        console.error(error);
      } finally {
        setGenerating(false);
      }
    },
    [id, generateSection]
  );

  if (loading || !currentProposal) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loading className="text-2xl" />
        <span className="ml-3 text-gray-600">Loading proposal...</span>
      </div>
    );
  }

  const activeSection = currentProposal.sections.find(s => s.id === activeSectionId);
  const completedSections = currentProposal.sections.filter(s => s.completedAt).length;
  const totalSections = currentProposal.sections.length;
  const progress = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Section Navigator */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <button
            onClick={() => navigate('/proposals')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Proposals
          </button>
          <h2 className="font-semibold text-sm truncate">{currentProposal.title}</h2>
        </div>

        <ScrollableContainer className="flex-1">
          <div className="p-2">
            <p className="text-xs text-gray-500 px-2 mb-2">Sections</p>
            {currentProposal.sections
              .sort((a, b) => a.order - b.order)
              .map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors',
                    activeSectionId === section.id
                      ? 'bg-blue-100 text-blue-900 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{section.title}</span>
                    {section.completedAt && (
                      <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
          </div>
        </ScrollableContainer>

        {/* Progress */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Overall Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {completedSections} of {totalSections} sections completed
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{currentProposal.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={cn(
                    'text-xs font-medium px-3 py-1 rounded-full',
                    statusColors[currentProposal.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'
                  )}
                >
                  {currentProposal.status.replace('_', ' ').toUpperCase()}
                </span>
                {currentProposal.grant && (
                  <span className="text-sm text-gray-600">
                    {currentProposal.grant.funderName}
                  </span>
                )}
                {currentProposal.requestedAmount && (
                  <span className="text-sm text-gray-600">
                    ${currentProposal.requestedAmount.toLocaleString()} requested
                  </span>
                )}
                {currentProposal.dueDate && (
                  <span className="text-sm text-gray-600">
                    Due {dayjs(currentProposal.dueDate).format('MMM D, YYYY')}
                  </span>
                )}
              </div>
            </div>
            <IconButton>
              <MoreVerticalIcon />
            </IconButton>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden flex">
          <ScrollableContainer className="flex-1 p-6">
            {activeSection ? (
              <SectionEditor
                section={activeSection}
                proposalId={currentProposal.id}
                onGenerate={handleGenerate}
                generating={generating}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a section to edit
              </div>
            )}
          </ScrollableContainer>

          {/* Right Sidebar - AI Assistant */}
          <div className="w-80 border-l border-gray-200 p-4 bg-gray-50 overflow-auto">
            <AIAssistantPanel
              proposalId={currentProposal.id}
              sectionId={activeSectionId || undefined}
              onGenerate={handleGenerate}
              generating={generating}
            />

            {/* Grant Info (if available) */}
            {currentProposal.grant && (
              <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm">Grant Details</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-gray-500">Funder</p>
                    <p className="font-medium">{currentProposal.grant.funderName}</p>
                  </div>
                  {currentProposal.grant.maxAmount && (
                    <div>
                      <p className="text-gray-500">Max Amount</p>
                      <p className="font-medium">
                        ${currentProposal.grant.maxAmount.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {currentProposal.grant.closeDate && (
                    <div>
                      <p className="text-gray-500">Deadline</p>
                      <p className="font-medium">
                        {dayjs(currentProposal.grant.closeDate).format('MMM D, YYYY')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
