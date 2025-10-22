import {
  Button,
  IconButton,
  Input,
  Loading,
  ScrollableContainer,
  Select,
  toast,
} from '@afk/component';
import { ArrowLeftIcon, CheckIcon, CommentIcon, DownloadIcon, MoreVerticalIcon, UserIcon } from '@blocksuite/icons/rc';
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

const ExportModal = ({
  proposalId,
  proposalTitle,
  onClose,
}: {
  proposalId: string;
  proposalTitle: string;
  onClose: () => void;
}) => {
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await gql({
        query: `
          mutation ExportProposal($proposalId: ID!, $format: ExportFormat!) {
            exportProposal(proposalId: $proposalId, format: $format) {
              fileUrl
              fileName
              mimeType
            }
          }
        `,
        variables: {
          proposalId,
          format: format.toUpperCase(),
        },
      });

      if (res.data?.exportProposal) {
        const { fileUrl, fileName } = res.data.exportProposal;

        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Proposal exported as ${format.toUpperCase()}`);
        onClose();
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export proposal. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Export Proposal</h2>

        <p className="text-sm text-gray-600 mb-4">
          Export "{proposalTitle}" to submit to grant funders.
        </p>

        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Format
          </label>

          <button
            onClick={() => setFormat('pdf')}
            className={cn(
              'w-full text-left p-4 border-2 rounded-lg transition-all',
              format === 'pdf'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">PDF Document</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Universal format, best for online submissions
                </p>
              </div>
              {format === 'pdf' && (
                <CheckIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
              )}
            </div>
          </button>

          <button
            onClick={() => setFormat('docx')}
            className={cn(
              'w-full text-left p-4 border-2 rounded-lg transition-all',
              format === 'docx'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Word Document (.docx)</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Editable format, best for further customization
                </p>
              </div>
              {format === 'docx' && (
                <CheckIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
              )}
            </div>
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} loading={exporting}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export {format.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface Approval {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  requestedAt: string;
  respondedAt?: string;
  feedback?: string;
  approver: {
    id: string;
    name: string;
    email: string;
  };
  requester: {
    id: string;
    name: string;
    email: string;
  };
}

const ApprovalModal = ({
  proposalId,
  proposalTitle,
  workspaceMembers,
  onClose,
}: {
  proposalId: string;
  proposalTitle: string;
  workspaceMembers: Array<{ id: string; name: string; email: string }>;
  onClose: () => void;
}) => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<'approved' | 'rejected' | 'changes_requested'>('approved');
  const [responseFeedback, setResponseFeedback] = useState('');

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gql({
        query: `
          query GetProposalApprovals($proposalId: ID!) {
            proposalApprovals(proposalId: $proposalId) {
              id
              status
              requestedAt
              respondedAt
              feedback
              approver {
                id
                name
                email
              }
              requester {
                id
                name
                email
              }
            }
          }
        `,
        variables: { proposalId },
      });

      if (res.data?.proposalApprovals) {
        setApprovals(res.data.proposalApprovals);
      }
    } catch (error) {
      console.error('Failed to load approvals:', error);
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleRequestApproval = async () => {
    if (!selectedApprover) return;

    setRequesting(true);
    try {
      await gql({
        query: `
          mutation RequestApproval($input: RequestApprovalInput!) {
            requestApproval(input: $input) {
              id
              status
            }
          }
        `,
        variables: {
          input: {
            proposalId,
            approverId: selectedApprover,
          },
        },
      });

      toast.success('Approval request sent');
      setSelectedApprover('');
      loadApprovals();
    } catch (error) {
      console.error('Failed to request approval:', error);
      toast.error('Failed to request approval');
    } finally {
      setRequesting(false);
    }
  };

  const handleRespond = async (approvalId: string) => {
    try {
      await gql({
        query: `
          mutation RespondToApproval($approvalId: ID!, $status: ApprovalStatus!, $feedback: String) {
            respondToApproval(approvalId: $approvalId, status: $status, feedback: $feedback) {
              id
              status
            }
          }
        `,
        variables: {
          approvalId,
          status: responseStatus.toUpperCase(),
          feedback: responseFeedback.trim() || undefined,
        },
      });

      toast.success(`Approval ${responseStatus}`);
      setRespondingTo(null);
      setResponseFeedback('');
      loadApprovals();
    } catch (error) {
      console.error('Failed to respond to approval:', error);
      toast.error('Failed to respond to approval');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    changes_requested: 'bg-orange-100 text-orange-700',
  };

  const statusLabels = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    changes_requested: 'Changes Requested',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Approval Workflow</h2>

        <p className="text-sm text-gray-600 mb-4">
          Request approval for "{proposalTitle}" before submission.
        </p>

        {/* Request New Approval */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3">Request Approval</h3>
          <div className="flex gap-3">
            <Select
              value={selectedApprover}
              onValueChange={setSelectedApprover}
              placeholder="Select team member..."
              className="flex-1"
            >
              {workspaceMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </Select>
            <Button
              onClick={handleRequestApproval}
              disabled={!selectedApprover || requesting}
              loading={requesting}
            >
              <UserIcon className="w-4 h-4 mr-2" />
              Request
            </Button>
          </div>
        </div>

        {/* Approvals List */}
        <div>
          <h3 className="font-semibold mb-3">
            Approval Requests ({approvals.length})
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loading />
            </div>
          ) : approvals.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No approval requests yet. Request approval from a team member to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {approvals.map(approval => (
                <div
                  key={approval.id}
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{approval.approver.name}</span>
                        <span
                          className={cn(
                            'text-xs px-2 py-1 rounded-full font-medium',
                            statusColors[approval.status]
                          )}
                        >
                          {statusLabels[approval.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Requested by {approval.requester.name} on{' '}
                        {dayjs(approval.requestedAt).format('MMM D, YYYY [at] h:mm A')}
                      </p>
                      {approval.respondedAt && (
                        <p className="text-xs text-gray-500">
                          Responded on {dayjs(approval.respondedAt).format('MMM D, YYYY [at] h:mm A')}
                        </p>
                      )}
                    </div>

                    {approval.status === 'pending' && (
                      <Button
                        size="small"
                        onClick={() => setRespondingTo(approval.id)}
                      >
                        Respond
                      </Button>
                    )}
                  </div>

                  {approval.feedback && (
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                      <p className="font-medium text-gray-700 mb-1">Feedback:</p>
                      <p className="text-gray-600">{approval.feedback}</p>
                    </div>
                  )}

                  {/* Response Form */}
                  {respondingTo === approval.id && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium mb-3">Provide Your Response</h4>

                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setResponseStatus('approved')}
                            className={cn(
                              'flex-1 py-2 px-3 rounded text-sm font-medium transition-all',
                              responseStatus === 'approved'
                                ? 'bg-green-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-green-600'
                            )}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setResponseStatus('changes_requested')}
                            className={cn(
                              'flex-1 py-2 px-3 rounded text-sm font-medium transition-all',
                              responseStatus === 'changes_requested'
                                ? 'bg-orange-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-orange-600'
                            )}
                          >
                            Request Changes
                          </button>
                          <button
                            onClick={() => setResponseStatus('rejected')}
                            className={cn(
                              'flex-1 py-2 px-3 rounded text-sm font-medium transition-all',
                              responseStatus === 'rejected'
                                ? 'bg-red-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-red-600'
                            )}
                          >
                            Reject
                          </button>
                        </div>

                        <textarea
                          value={responseFeedback}
                          onChange={e => setResponseFeedback(e.target.value)}
                          placeholder="Add feedback (optional)..."
                          className="w-full h-20 p-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => {
                              setRespondingTo(null);
                              setResponseFeedback('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleRespond(approval.id)}
                          >
                            Submit Response
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  resolved: boolean;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

const CommentsPanel = ({
  proposalId,
  sectionId,
}: {
  proposalId: string;
  sectionId?: string;
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const loadComments = useCallback(async () => {
    if (!sectionId) return;

    setLoading(true);
    try {
      const res = await gql({
        query: `
          query GetComments($proposalId: ID!, $sectionId: ID) {
            comments(proposalId: $proposalId, sectionId: $sectionId) {
              id
              content
              createdAt
              resolved
              author {
                id
                name
                email
              }
            }
          }
        `,
        variables: { proposalId, sectionId },
      });

      if (res.data?.comments) {
        setComments(res.data.comments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }, [proposalId, sectionId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleAddComment = async () => {
    if (!sectionId || !newComment.trim()) return;

    setSubmitting(true);
    try {
      await gql({
        query: `
          mutation CreateComment($input: CreateCommentInput!) {
            createComment(input: $input) {
              id
              content
              createdAt
              author {
                id
                name
                email
              }
            }
          }
        `,
        variables: {
          input: {
            proposalId,
            sectionId,
            content: newComment.trim(),
          },
        },
      });

      setNewComment('');
      toast.success('Comment added');
      loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleResolved = async (commentId: string, resolved: boolean) => {
    try {
      await gql({
        query: `
          mutation ResolveComment($commentId: ID!, $resolved: Boolean!) {
            updateComment(commentId: $commentId, resolved: $resolved) {
              id
              resolved
            }
          }
        `,
        variables: { commentId, resolved: !resolved },
      });

      toast.success(resolved ? 'Comment reopened' : 'Comment resolved');
      loadComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const filteredComments = showResolved
    ? comments
    : comments.filter(c => !c.resolved);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Comments</h3>
        {comments.length > 0 && (
          <span className="text-xs text-gray-500">
            {filteredComments.length} {showResolved ? 'total' : 'open'}
          </span>
        )}
      </div>

      {!sectionId ? (
        <p className="text-sm text-gray-500">Select a section to view comments</p>
      ) : (
        <>
          {/* Add Comment */}
          <div className="mb-4">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment or suggestion..."
              className="w-full h-20 p-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || submitting}
              loading={submitting}
              size="small"
              className="w-full mt-2"
            >
              <CommentIcon className="w-4 h-4 mr-2" />
              Add Comment
            </Button>
          </div>

          {/* Comments List */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loading />
            </div>
          ) : filteredComments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {showResolved ? 'No comments yet' : 'No open comments'}
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredComments.map(comment => (
                <div
                  key={comment.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    comment.resolved
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white border-gray-300'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-medium">{comment.author.name}</p>
                      <p className="text-xs text-gray-500">
                        {dayjs(comment.createdAt).format('MMM D, h:mm A')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleResolved(comment.id, comment.resolved)}
                      className={cn(
                        'text-xs px-2 py-1 rounded',
                        comment.resolved
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      )}
                    >
                      {comment.resolved ? 'Reopen' : 'Resolve'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Show/Hide Resolved Toggle */}
          {comments.some(c => c.resolved) && (
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="w-full mt-3 text-sm text-blue-600 hover:underline"
            >
              {showResolved ? 'Hide' : 'Show'} resolved comments
            </button>
          )}
        </>
      )}
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

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
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowApprovalModal(true)}
                variant="secondary"
                size="small"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Approvals
              </Button>
              <Button
                onClick={() => setShowExportModal(true)}
                variant="secondary"
                size="small"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export
              </Button>
              <IconButton>
                <MoreVerticalIcon />
              </IconButton>
            </div>
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

          {/* Right Sidebar - Comments & AI Assistant */}
          <div className="w-80 border-l border-gray-200 p-4 bg-gray-50 overflow-auto space-y-4">
            <CommentsPanel
              proposalId={currentProposal.id}
              sectionId={activeSectionId || undefined}
            />

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

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          proposalId={currentProposal.id}
          proposalTitle={currentProposal.title}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Approval Modal */}
      {showApprovalModal && currentProposal.workspace && (
        <ApprovalModal
          proposalId={currentProposal.id}
          proposalTitle={currentProposal.title}
          workspaceMembers={currentProposal.workspace.members || []}
          onClose={() => setShowApprovalModal(false)}
        />
      )}
    </div>
  );
};
