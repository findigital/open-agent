import { Button } from '@afk/component';
import {
  FileIcon,
  EmailIcon,
  UploadIcon,
  PlusIcon,
} from '@blocksuite/icons/rc';

interface QuickActionsCardProps {
  onCreateReport: () => void;
  onDraftEmail: () => void;
  onUploadDocument: () => void;
  onAddRequirement: () => void;
}

export const QuickActionsCard = ({
  onCreateReport,
  onDraftEmail,
  onUploadDocument,
  onAddRequirement,
}: QuickActionsCardProps) => {
  const actions = [
    {
      label: 'Create Impact Report',
      icon: FileIcon,
      onClick: onCreateReport,
      variant: 'primary' as const,
    },
    {
      label: 'Draft Email',
      icon: EmailIcon,
      onClick: onDraftEmail,
      variant: 'default' as const,
    },
    {
      label: 'Upload Document',
      icon: UploadIcon,
      onClick: onUploadDocument,
      variant: 'default' as const,
    },
    {
      label: 'Add Requirement',
      icon: PlusIcon,
      onClick: onAddRequirement,
      variant: 'default' as const,
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              onClick={action.onClick}
              variant={action.variant}
              className="w-full justify-start"
            >
              <Icon className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
