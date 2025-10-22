import {
  Button,
  Loading,
  ScrollableContainer,
  Select,
  toast,
} from '@afk/component';
import { CheckIcon, PageIcon } from '@blocksuite/icons/rc';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { cn } from '@/lib/utils';
import { gql } from '@/lib/gql';
import { useProposalsStore } from '@/store/proposals';

import { AutoSidebarPadding } from '../layout/auto-sidebar-padding';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  isPublic: boolean;
  createdAt: string;
  sections: Array<{
    id: string;
    title: string;
    type: string;
    order: number;
    wordLimit?: number;
    aiPromptGuidance?: string;
  }>;
}

const categoryColors = {
  federal: 'bg-blue-100 text-blue-700',
  foundation: 'bg-purple-100 text-purple-700',
  corporate: 'bg-green-100 text-green-700',
  government: 'bg-red-100 text-red-700',
  custom: 'bg-gray-100 text-gray-700',
};

const categoryLabels = {
  federal: 'Federal Grant',
  foundation: 'Foundation Grant',
  corporate: 'Corporate Sponsorship',
  government: 'Government RFP',
  custom: 'Custom',
};

const TemplateCard = ({
  template,
  onPreview,
  onUse,
}: {
  template: Template;
  onPreview: (template: Template) => void;
  onUse: (template: Template) => void;
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <PageIcon className="w-6 h-6 mt-1 text-gray-500" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
          </div>
        </div>
      </div>

      {/* Category Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            'text-xs font-medium px-3 py-1 rounded-full',
            categoryColors[template.category as keyof typeof categoryColors] || categoryColors.custom
          )}
        >
          {categoryLabels[template.category as keyof typeof categoryLabels] || template.category}
        </span>
        {template.isPublic && (
          <span className="text-xs text-gray-500">Public Template</span>
        )}
      </div>

      {/* Sections Preview */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">{template.sections.length} Sections:</p>
        <div className="flex flex-wrap gap-1">
          {template.sections.slice(0, 5).map(section => (
            <span
              key={section.id}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
            >
              {section.title}
            </span>
          ))}
          {template.sections.length > 5 && (
            <span className="text-xs text-gray-500 px-2 py-1">
              +{template.sections.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="small"
          onClick={() => onPreview(template)}
          className="flex-1"
        >
          Preview
        </Button>
        <Button
          size="small"
          onClick={() => onUse(template)}
          className="flex-1"
        >
          Use Template
        </Button>
      </div>
    </div>
  );
};

const TemplatePreviewModal = ({
  template,
  onClose,
  onUse,
}: {
  template: Template;
  onClose: () => void;
  onUse: (template: Template) => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2">{template.name}</h2>
        <p className="text-gray-600 mb-4">{template.description}</p>

        <div className="flex items-center gap-2 mb-6">
          <span
            className={cn(
              'text-xs font-medium px-3 py-1 rounded-full',
              categoryColors[template.category as keyof typeof categoryColors] || categoryColors.custom
            )}
          >
            {categoryLabels[template.category as keyof typeof categoryLabels] || template.category}
          </span>
          {template.isPublic && (
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
              Public Template
            </span>
          )}
        </div>

        {/* Sections List */}
        <div>
          <h3 className="font-semibold mb-3">Template Sections ({template.sections.length})</h3>
          <div className="space-y-2">
            {template.sections
              .sort((a, b) => a.order - b.order)
              .map((section, index) => (
                <div
                  key={section.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-semibold">{section.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">Type: {section.type}</p>
                      </div>
                    </div>
                    {section.wordLimit && (
                      <span className="text-xs bg-white border border-gray-300 px-2 py-1 rounded">
                        {section.wordLimit} words max
                      </span>
                    )}
                  </div>
                  {section.aiPromptGuidance && (
                    <div className="mt-2 p-3 bg-blue-50 rounded text-sm">
                      <p className="font-medium text-blue-900 mb-1">AI Guidance:</p>
                      <p className="text-gray-700">{section.aiPromptGuidance}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              onUse(template);
              onClose();
            }}
          >
            Use This Template
          </Button>
        </div>
      </div>
    </div>
  );
};

export const TemplatesLibrary = () => {
  const navigate = useNavigate();
  const { currentWorkspaceId } = useProposalsStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [categoryFilter]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await gql({
        query: `
          query GetTemplates($workspaceId: ID, $category: String, $isPublic: Boolean) {
            templates(workspaceId: $workspaceId, category: $category, isPublic: $isPublic) {
              id
              name
              description
              category
              isPublic
              createdAt
              sections {
                id
                title
                type
                order
                wordLimit
                aiPromptGuidance
              }
            }
          }
        `,
        variables: {
          workspaceId: currentWorkspaceId || undefined,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          isPublic: true,
        },
      });

      if (res.data?.templates) {
        setTemplates(res.data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template: Template) => {
    // Navigate to create proposal page with template pre-selected
    navigate(`/proposals/new?templateId=${template.id}`);
  };

  return (
    <AutoSidebarPadding className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Proposal Templates</h1>
            <p className="text-sm text-gray-600 mt-1">
              Choose a template to get started with your proposal
            </p>
          </div>
          <Button onClick={() => navigate('/proposals/new')}>
            Create from Scratch
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-3">
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            placeholder="All Categories"
            className="w-64"
          >
            <option value="all">All Categories</option>
            <option value="federal">Federal Grant</option>
            <option value="foundation">Foundation Grant</option>
            <option value="corporate">Corporate Sponsorship</option>
            <option value="government">Government RFP</option>
            <option value="custom">Custom</option>
          </Select>
        </div>
      </div>

      {/* Content */}
      <ScrollableContainer className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loading className="text-2xl" />
            <span className="ml-3 text-gray-600">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <PageIcon className="text-[97px] text-gray-300" />
            <span className="text-[15px] leading-[24px] font-medium mt-4">
              No templates found
            </span>
            <span className="text-sm leading-[22px] text-gray-500 mt-1">
              Try a different category or create a custom proposal
            </span>
            <Button className="mt-4" onClick={() => navigate('/proposals/new')}>
              Create from Scratch
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={setPreviewTemplate}
                onUse={handleUseTemplate}
              />
            ))}
          </div>
        )}
      </ScrollableContainer>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={handleUseTemplate}
        />
      )}
    </AutoSidebarPadding>
  );
};
