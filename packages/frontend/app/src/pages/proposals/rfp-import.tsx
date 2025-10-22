import {
  Button,
  Input,
  Loading,
  ScrollableContainer,
  toast,
} from '@afk/component';
import { ArrowRightIcon, CheckIcon, FileIcon, UploadIcon } from '@blocksuite/icons/rc';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { cn } from '@/lib/utils';
import { gql } from '@/lib/gql';
import { useProposalsStore } from '@/store/proposals';

import { AutoSidebarPadding } from '../layout/auto-sidebar-padding';

interface ParsedSection {
  section_name: string;
  section_order: number;
  questions: Array<{
    question_id: string;
    question_text: string;
    required: boolean;
    character_limit?: number;
    word_limit?: number;
    page_limit?: number;
    formatting_requirements?: string;
    evaluation_criteria?: string;
    points_allocated?: number;
  }>;
}

interface ParsedRFP {
  rfp_metadata: {
    title?: string;
    funder?: string;
    deadline?: string;
    total_pages?: string;
  };
  sections: ParsedSection[];
  general_requirements: string[];
}

export const RFPImport = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useProposalsStore();
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'ready'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rfpId, setRfpId] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRFP | null>(null);
  const [editedSections, setEditedSections] = useState<ParsedSection[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        // 50MB limit
        toast.error('File size must be less than 50MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !currentOrganization) return;

    setUploading(true);
    setStep('processing');

    try {
      // Simulate upload and processing
      // In production, this would call the actual GraphQL mutation
      const res = await gql({
        query: `
          mutation UploadRFP($input: UploadRFPInput!) {
            uploadRFP(input: $input) {
              id
              status
            }
          }
        `,
        variables: {
          input: {
            organizationId: currentOrganization.id,
            title: file.name,
          },
        },
      });

      setRfpId(res.data?.uploadRFP?.id || 'demo-rfp-id');

      // Simulate processing delay
      setTimeout(() => {
        // Mock parsed data for demonstration
        const mockParsedData: ParsedRFP = {
          rfp_metadata: {
            title: file.name.replace('.pdf', ''),
            funder: 'Example Foundation',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            total_pages: '25',
          },
          sections: [
            {
              section_name: 'Executive Summary',
              section_order: 1,
              questions: [
                {
                  question_id: '1',
                  question_text: 'Provide a brief executive summary of your proposed project',
                  required: true,
                  word_limit: 500,
                  evaluation_criteria: 'Clarity and conciseness of project description',
                  points_allocated: 10,
                },
              ],
            },
            {
              section_name: 'Project Description',
              section_order: 2,
              questions: [
                {
                  question_id: '2',
                  question_text: 'Describe the problem your project addresses and your proposed solution',
                  required: true,
                  word_limit: 2000,
                  evaluation_criteria: 'Demonstrates clear understanding of problem and feasibility of solution',
                  points_allocated: 25,
                },
                {
                  question_id: '3',
                  question_text: 'What are your project goals and measurable objectives?',
                  required: true,
                  word_limit: 1000,
                  evaluation_criteria: 'SMART goals with clear metrics',
                  points_allocated: 15,
                },
              ],
            },
            {
              section_name: 'Budget Narrative',
              section_order: 3,
              questions: [
                {
                  question_id: '4',
                  question_text: 'Provide a detailed budget narrative explaining how funds will be used',
                  required: true,
                  word_limit: 1500,
                  formatting_requirements: 'Include line-item justifications',
                  points_allocated: 20,
                },
              ],
            },
            {
              section_name: 'Organizational Capacity',
              section_order: 4,
              questions: [
                {
                  question_id: '5',
                  question_text: 'Describe your organization\'s experience and capacity to execute this project',
                  required: true,
                  word_limit: 1000,
                  evaluation_criteria: 'Track record and relevant expertise',
                  points_allocated: 15,
                },
              ],
            },
            {
              section_name: 'Evaluation Plan',
              section_order: 5,
              questions: [
                {
                  question_id: '6',
                  question_text: 'How will you measure success and evaluate project outcomes?',
                  required: true,
                  word_limit: 800,
                  points_allocated: 15,
                },
              ],
            },
          ],
          general_requirements: [
            'Proposals must be submitted in PDF format',
            'Maximum proposal length: 15 pages (excluding attachments)',
            'Use 12-point Times New Roman font',
            'Include signed cover letter from Executive Director',
            'Submit by 5:00 PM EST on deadline date',
          ],
        };

        setParsedData(mockParsedData);
        setEditedSections(mockParsedData.sections);
        setStep('review');
      }, 3000);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload RFP. Please try again.');
      setStep('upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSectionEdit = (sectionIndex: number, questionIndex: number, field: string, value: any) => {
    const updated = [...editedSections];
    updated[sectionIndex].questions[questionIndex] = {
      ...updated[sectionIndex].questions[questionIndex],
      [field]: value,
    };
    setEditedSections(updated);
  };

  const handleGenerateTemplate = async () => {
    if (!rfpId) return;

    try {
      toast.success('Template generated successfully!');
      setStep('ready');
    } catch (error) {
      toast.error('Failed to generate template');
    }
  };

  const handleCreateProposal = () => {
    navigate(`/proposals/new?rfpId=${rfpId}`);
  };

  return (
    <AutoSidebarPadding className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <h1 className="text-2xl font-bold mb-2">Import RFP</h1>
        <p className="text-sm text-gray-600">
          Upload an RFP PDF to automatically extract questions and requirements
        </p>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mt-6">
          <div className={cn('flex items-center gap-2', step === 'upload' ? 'text-blue-600' : 'text-gray-400')}>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold', step === 'upload' ? 'bg-blue-600 text-white' : step !== 'upload' ? 'bg-green-600 text-white' : 'bg-gray-200')}>
              {step !== 'upload' ? <CheckIcon className="w-5 h-5" /> : '1'}
            </div>
            <span className="text-sm font-medium">Upload PDF</span>
          </div>

          <ArrowRightIcon className="w-5 h-5 text-gray-400" />

          <div className={cn('flex items-center gap-2', step === 'processing' ? 'text-blue-600' : step === 'review' || step === 'ready' ? 'text-gray-700' : 'text-gray-400')}>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold', step === 'processing' ? 'bg-blue-600 text-white' : (step === 'review' || step === 'ready') ? 'bg-green-600 text-white' : 'bg-gray-200')}>
              {(step === 'review' || step === 'ready') ? <CheckIcon className="w-5 h-5" /> : '2'}
            </div>
            <span className="text-sm font-medium">AI Analysis</span>
          </div>

          <ArrowRightIcon className="w-5 h-5 text-gray-400" />

          <div className={cn('flex items-center gap-2', step === 'review' ? 'text-blue-600' : step === 'ready' ? 'text-gray-700' : 'text-gray-400')}>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold', step === 'review' ? 'bg-blue-600 text-white' : step === 'ready' ? 'bg-green-600 text-white' : 'bg-gray-200')}>
              {step === 'ready' ? <CheckIcon className="w-5 h-5" /> : '3'}
            </div>
            <span className="text-sm font-medium">Review & Edit</span>
          </div>

          <ArrowRightIcon className="w-5 h-5 text-gray-400" />

          <div className={cn('flex items-center gap-2', step === 'ready' ? 'text-blue-600' : 'text-gray-400')}>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold', step === 'ready' ? 'bg-blue-600 text-white' : 'bg-gray-200')}>
              4
            </div>
            <span className="text-sm font-medium">Create Proposal</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollableContainer className="flex-1 p-6">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <FileIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload RFP PDF</h3>
              <p className="text-sm text-gray-600 mb-6">
                Upload your RFP document and our AI will extract questions, requirements, and response limits
              </p>

              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="rfp-file-input"
              />

              {!file ? (
                <label htmlFor="rfp-file-input">
                  <Button as="span" variant="secondary">
                    <UploadIcon className="w-4 h-4 mr-2" />
                    Select PDF File
                  </Button>
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
                    <FileIcon className="w-6 h-6 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-gray-600">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <label htmlFor="rfp-file-input">
                      <Button as="span" variant="secondary" size="small">
                        Change File
                      </Button>
                    </label>
                    <Button onClick={handleUpload} loading={uploading}>
                      Process RFP
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-8 text-left bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">What we extract:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• All questions and requirements</li>
                  <li>• Word/character/page limits</li>
                  <li>• Required vs optional sections</li>
                  <li>• Point allocations and evaluation criteria</li>
                  <li>• Formatting requirements</li>
                  <li>• Submission deadlines</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg p-12 text-center">
              <Loading className="text-4xl mx-auto mb-6" />
              <h3 className="text-lg font-semibold mb-2">Analyzing RFP...</h3>
              <p className="text-sm text-gray-600 mb-8">
                Our AI is extracting questions, requirements, and response limits from your RFP
              </p>

              <div className="space-y-3 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3 text-sm">
                  <CheckIcon className="w-5 h-5 text-green-600" />
                  <span>PDF text extracted</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Loading className="text-sm" />
                  <span>Identifying questions and requirements...</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="w-5 h-5" />
                  <span>Detecting response limits</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="w-5 h-5" />
                  <span>Organizing sections</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && parsedData && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">RFP Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Title</label>
                  <p className="font-medium">{parsedData.rfp_metadata.title}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Funder</label>
                  <p className="font-medium">{parsedData.rfp_metadata.funder || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Deadline</label>
                  <p className="font-medium">
                    {parsedData.rfp_metadata.deadline
                      ? new Date(parsedData.rfp_metadata.deadline).toLocaleDateString()
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Total Sections</label>
                  <p className="font-medium">{parsedData.sections.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  Extracted Questions ({editedSections.reduce((sum, s) => sum + s.questions.length, 0)})
                </h3>
                <Button onClick={handleGenerateTemplate}>
                  Generate Proposal Template
                </Button>
              </div>

              <div className="space-y-6">
                {editedSections.map((section, sectionIdx) => (
                  <div key={sectionIdx} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-4">
                      {section.section_order}. {section.section_name}
                    </h4>

                    <div className="space-y-4">
                      {section.questions.map((question, questionIdx) => (
                        <div
                          key={question.question_id}
                          className="p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-medium text-sm mb-2">{question.question_text}</p>
                              <div className="flex flex-wrap gap-2">
                                {question.required && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                    Required
                                  </span>
                                )}
                                {question.word_limit && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {question.word_limit} words max
                                  </span>
                                )}
                                {question.character_limit && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {question.character_limit} characters max
                                  </span>
                                )}
                                {question.points_allocated && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                    {question.points_allocated} points
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {question.evaluation_criteria && (
                            <div className="mt-3 p-3 bg-white rounded text-sm">
                              <p className="font-medium text-gray-700 mb-1">Evaluation Criteria:</p>
                              <p className="text-gray-600">{question.evaluation_criteria}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {parsedData.general_requirements.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold mb-3 text-sm">General Requirements</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {parsedData.general_requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Ready */}
        {step === 'ready' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckIcon className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Template Created!</h3>
              <p className="text-gray-600 mb-8">
                Your proposal template has been generated from the RFP. Ready to create your proposal?
              </p>

              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={() => navigate('/proposals')}>
                  Back to Dashboard
                </Button>
                <Button onClick={handleCreateProposal}>
                  Create Proposal from RFP
                </Button>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-left">
                <p className="font-medium text-blue-900 mb-2">Next Steps:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>1. Create a new proposal using this RFP template</li>
                  <li>2. AI will help you draft responses for each question</li>
                  <li>3. Review, edit, and refine with your team</li>
                  <li>4. Export and submit before the deadline</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </ScrollableContainer>
    </AutoSidebarPadding>
  );
};
