import {
  Button,
  IconButton,
  Input,
  Loading,
  Menu,
  MenuItem,
  Select,
  toast,
} from '@afk/component';
import {
  DeleteIcon,
  FileIcon,
  MoreVerticalIcon,
  SearchIcon,
  UploadIcon,
} from '@blocksuite/icons/rc';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { gql } from '@/lib/gql';
import { useProposalsStore } from '@/store/proposals';

import { AutoSidebarPadding } from '../layout/auto-sidebar-padding';

interface Document {
  id: string;
  title: string;
  type: string;
  content: string;
  metadata?: any;
  tags: string[];
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

const documentTypes = {
  mission: { label: 'Mission Statement', color: 'bg-blue-100 text-blue-700' },
  annual_report: { label: 'Annual Report', color: 'bg-green-100 text-green-700' },
  program_description: { label: 'Program Description', color: 'bg-purple-100 text-purple-700' },
  impact_story: { label: 'Impact Story', color: 'bg-orange-100 text-orange-700' },
  financials: { label: 'Financials', color: 'bg-red-100 text-red-700' },
  board_info: { label: 'Board Info', color: 'bg-indigo-100 text-indigo-700' },
};

const DocumentCard = ({
  document,
  onDelete,
}: {
  document: Document;
  onDelete: () => void;
}) => {
  const typeInfo = documentTypes[document.type as keyof typeof documentTypes] || {
    label: document.type,
    color: 'bg-gray-100 text-gray-700',
  };

  const preview = document.content.substring(0, 200) + '...';

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2 flex-1">
          <FileIcon className="w-5 h-5 mt-0.5 text-gray-500" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold truncate">{document.title}</h3>
            <span className={cn('text-xs font-medium px-2 py-1 rounded mt-1 inline-block', typeInfo.color)}>
              {typeInfo.label}
            </span>
          </div>
        </div>
        <Menu
          items={
            <>
              <MenuItem>View Full</MenuItem>
              <MenuItem>Edit</MenuItem>
              <MenuItem>Generate Embeddings</MenuItem>
              <MenuItem className="text-red-600" onClick={onDelete}>
                <DeleteIcon className="w-4 h-4 mr-2" />
                Delete
              </MenuItem>
            </>
          }
        >
          <IconButton>
            <MoreVerticalIcon className="w-5 h-5" />
          </IconButton>
        </Menu>
      </div>

      <p className="text-sm text-gray-600 line-clamp-3 mb-3">{preview}</p>

      {document.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {document.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500">
        Updated {dayjs(document.updatedAt).format('MMM D, YYYY')}
      </div>
    </div>
  );
};

export const DocumentsLibrary = () => {
  const { currentOrganization, refreshOrganizations } = useProposalsStore();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('mission');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!currentOrganization) {
      refreshOrganizations();
    }
  }, [currentOrganization, refreshOrganizations]);

  const loadDocuments = useCallback(async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      const res = await gql({
        query: `
          query GetDocuments($organizationId: ID!, $type: DocumentType) {
            documentsByOrganization(organizationId: $organizationId, type: $type) {
              id
              title
              type
              content
              metadata
              tags
              uploadedBy
              createdAt
              updatedAt
            }
          }
        `,
        variables: {
          organizationId: currentOrganization.id,
          type: typeFilter === 'all' ? undefined : typeFilter,
        },
      });

      if (res.data?.documentsByOrganization) {
        setDocuments(res.data.documentsByOrganization);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, typeFilter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async () => {
    if (!currentOrganization || !uploadTitle.trim() || !uploadContent.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      const res = await gql({
        query: `
          mutation CreateDocument($input: CreateDocumentInput!) {
            createDocument(input: $input) {
              id
              title
              type
            }
          }
        `,
        variables: {
          input: {
            organizationId: currentOrganization.id,
            title: uploadTitle.trim(),
            type: uploadType,
            content: uploadContent.trim(),
            tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
          },
        },
      });

      if (res.data?.createDocument) {
        toast.success('Document uploaded successfully!');
        setShowUploadModal(false);
        setUploadTitle('');
        setUploadContent('');
        setUploadTags('');
        loadDocuments();
      }
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await gql({
        query: `
          mutation DeleteDocument($id: ID!) {
            deleteDocument(id: $id)
          }
        `,
        variables: { id: documentId },
      });

      toast.success('Document deleted');
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AutoSidebarPadding className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Document Library</h1>
            {currentOrganization && (
              <p className="text-sm text-gray-600 mt-1">{currentOrganization.name}</p>
            )}
          </div>
          <Button onClick={() => setShowUploadModal(true)}>
            <UploadIcon className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
            className="w-64"
          >
            <option value="all">All Types</option>
            <option value="mission">Mission Statement</option>
            <option value="annual_report">Annual Report</option>
            <option value="program_description">Program Description</option>
            <option value="impact_story">Impact Story</option>
            <option value="financials">Financials</option>
            <option value="board_info">Board Info</option>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loading className="text-2xl" />
            <span className="ml-3 text-gray-600">Loading documents...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <FileIcon className="text-[97px] text-gray-300" />
            <p className="text-lg font-medium mt-4">No documents yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Upload organization documents to power AI proposal generation
            </p>
            <Button onClick={() => setShowUploadModal(true)} className="mt-4">
              Upload Your First Document
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={() => handleDelete(doc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">Upload Document</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g., Annual Report 2023"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={uploadType}
                  onValueChange={setUploadType}
                  className="w-full"
                >
                  <option value="mission">Mission Statement</option>
                  <option value="annual_report">Annual Report</option>
                  <option value="program_description">Program Description</option>
                  <option value="impact_story">Impact Story</option>
                  <option value="financials">Financials</option>
                  <option value="board_info">Board Info</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={uploadContent}
                  onChange={e => setUploadContent(e.target.value)}
                  placeholder="Paste or type your document content here..."
                  className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This content will be used by AI to generate relevant proposal sections
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (optional)
                </label>
                <Input
                  value={uploadTags}
                  onChange={e => setUploadTags(e.target.value)}
                  placeholder="environment, education, programs (comma-separated)"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadTitle('');
                  setUploadContent('');
                  setUploadTags('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                loading={uploading}
                disabled={!uploadTitle.trim() || !uploadContent.trim()}
              >
                Upload Document
              </Button>
            </div>
          </div>
        </div>
      )}
    </AutoSidebarPadding>
  );
};
