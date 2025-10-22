# RFP PDF Parsing - Implementation Plan

## Overview
This feature enables users to upload RFP PDFs and automatically extract questions, requirements, and response limits to generate a structured proposal template.

## Architecture

### Data Flow
```
User uploads PDF → Backend PDF Parser → Text Extraction →
AI Analysis (Claude) → Structured Questions → Review UI →
Create Proposal Template → Proposal Editor
```

### Components

#### 1. Backend (NestJS)
- **PDF Parser Service**: Extract text from PDF
- **RFP Analysis Service**: AI-powered question extraction
- **RFP Storage**: Store parsed RFP data
- **Template Generator**: Create proposal template from extracted questions

#### 2. Frontend (React)
- **RFP Upload Wizard**: Multi-step upload and review flow
- **Questions Review**: Edit and organize extracted questions
- **Template Preview**: Preview generated proposal structure

#### 3. AI Integration
- **Claude 3.5 Sonnet**: Question extraction and requirement analysis
- **Structured Output**: JSON format for questions and limits

## Implementation Details

### Backend Implementation

#### 1. Database Schema (Prisma)

```prisma
model RFP {
  id                String   @id @default(cuid())
  organizationId    String
  title             String
  funderName        String?
  description       String?
  dueDate           DateTime?
  fileUrl           String
  fileName          String
  fileSize          Int
  parsedText        String?  // Extracted PDF text
  parsedQuestions   Json?    // Structured questions array
  status            String   @default("processing") // processing, completed, failed
  createdById       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy         User         @relation(fields: [createdById], references: [id])
  proposals         Proposal[]

  @@index([organizationId])
  @@index([status])
}
```

#### 2. RFP Service (`rfp.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as pdfParse from 'pdf-parse';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class RFPService {
  private anthropic: Anthropic;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Upload and parse RFP PDF
   */
  async uploadRFP(
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    metadata?: { title?: string; funderName?: string; dueDate?: Date }
  ) {
    // 1. Save file to storage (S3/local)
    const fileUrl = await this.saveFile(file);

    // 2. Create RFP record
    const rfp = await this.prisma.rFP.create({
      data: {
        organizationId,
        createdById: userId,
        title: metadata?.title || file.originalname,
        funderName: metadata?.funderName,
        dueDate: metadata?.dueDate,
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        status: 'processing',
      },
    });

    // 3. Process PDF asynchronously
    this.processRFPAsync(rfp.id, file.buffer);

    return rfp;
  }

  /**
   * Extract text from PDF
   */
  private async extractPDFText(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
  }

  /**
   * Process RFP with AI
   */
  private async processRFPAsync(rfpId: string, fileBuffer: Buffer) {
    try {
      // 1. Extract text from PDF
      const text = await this.extractPDFText(fileBuffer);

      // 2. Update RFP with extracted text
      await this.prisma.rFP.update({
        where: { id: rfpId },
        data: { parsedText: text },
      });

      // 3. Analyze with AI
      const questions = await this.extractQuestions(text);

      // 4. Update RFP with parsed questions
      await this.prisma.rFP.update({
        where: { id: rfpId },
        data: {
          parsedQuestions: questions,
          status: 'completed',
        },
      });
    } catch (error) {
      console.error('RFP processing failed:', error);
      await this.prisma.rFP.update({
        where: { id: rfpId },
        data: { status: 'failed' },
      });
    }
  }

  /**
   * Extract questions using Claude
   */
  private async extractQuestions(rfpText: string): Promise<any> {
    const prompt = `You are an expert at analyzing RFP (Request for Proposal) documents.

Your task is to extract all questions, requirements, and submission criteria from the RFP text below.

For each question/requirement, identify:
1. The question or requirement text
2. The section it belongs to (e.g., "Executive Summary", "Project Description", "Budget", etc.)
3. Any character or word limits mentioned
4. Whether it's required or optional
5. Any specific formatting requirements
6. The order/sequence number

Return a JSON array with this structure:
{
  "rfp_metadata": {
    "title": "extracted RFP title",
    "funder": "funder name if mentioned",
    "deadline": "submission deadline if mentioned",
    "total_pages": "page count if mentioned"
  },
  "sections": [
    {
      "section_name": "Section name from RFP",
      "section_order": 1,
      "questions": [
        {
          "question_id": "unique_id",
          "question_text": "The actual question or requirement",
          "required": true/false,
          "character_limit": number or null,
          "word_limit": number or null,
          "page_limit": number or null,
          "formatting_requirements": "any specific formatting mentioned",
          "evaluation_criteria": "how this will be evaluated if mentioned",
          "points_allocated": number or null
        }
      ]
    }
  ],
  "general_requirements": [
    "List of general submission requirements (format, deadline, etc.)"
  ]
}

Be thorough and extract ALL questions and requirements. Pay special attention to:
- Word/character/page limits
- Required vs optional sections
- Point allocations for scoring
- Formatting requirements (font, spacing, etc.)
- Submission deadlines and methods

RFP Text:
${rfpText}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 16000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse JSON response
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse AI response');
  }

  /**
   * Generate proposal template from RFP
   */
  async generateTemplateFromRFP(rfpId: string, userId: string) {
    const rfp = await this.prisma.rFP.findUnique({
      where: { id: rfpId },
      include: { organization: true },
    });

    if (!rfp || !rfp.parsedQuestions) {
      throw new Error('RFP not found or not processed');
    }

    const parsed = rfp.parsedQuestions as any;

    // Create custom template from RFP
    const template = await this.prisma.proposalTemplate.create({
      data: {
        organizationId: rfp.organizationId,
        name: `${rfp.title} - Template`,
        description: `Auto-generated from RFP: ${rfp.title}`,
        category: 'custom',
        isPublic: false,
        createdById: userId,
      },
    });

    // Create sections from parsed questions
    let order = 1;
    for (const section of parsed.sections || []) {
      for (const question of section.questions || []) {
        await this.prisma.templateSection.create({
          data: {
            templateId: template.id,
            title: question.question_text.substring(0, 100),
            type: section.section_name,
            order: order++,
            wordLimit: question.word_limit || question.character_limit ?
              Math.ceil((question.character_limit || 0) / 5) : // Rough char to word conversion
              question.word_limit,
            required: question.required !== false,
            aiPromptGuidance: question.evaluation_criteria ||
              `Address this requirement from the RFP: ${question.question_text}`,
          },
        });
      }
    }

    return template;
  }

  /**
   * Save file to storage
   */
  private async saveFile(file: Express.Multer.File): Promise<string> {
    // TODO: Implement S3 or local storage
    // For now, return a placeholder
    return `/uploads/rfps/${Date.now()}-${file.originalname}`;
  }
}
```

#### 3. GraphQL Schema

```graphql
type RFP {
  id: ID!
  title: String!
  funderName: String
  dueDate: DateTime
  fileName: String!
  fileSize: Int!
  status: RFPStatus!
  parsedQuestions: JSON
  createdAt: DateTime!
  createdBy: User!
}

enum RFPStatus {
  PROCESSING
  COMPLETED
  FAILED
}

input UploadRFPInput {
  organizationId: ID!
  file: Upload!
  title: String
  funderName: String
  dueDate: DateTime
}

type Query {
  rfps(organizationId: ID!): [RFP!]!
  rfp(id: ID!): RFP
}

type Mutation {
  uploadRFP(input: UploadRFPInput!): RFP!
  generateTemplateFromRFP(rfpId: ID!): ProposalTemplate!
  updateRFPQuestions(rfpId: ID!, questions: JSON!): RFP!
}
```

### Frontend Implementation

#### 1. RFP Upload Wizard (`rfp-upload-wizard.tsx`)

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Loading, toast } from '@afk/component';
import { gql } from '@/lib/gql';

export const RFPUploadWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rfpId, setRfpId] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

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
            organizationId: 'current-org-id',
            file: formData,
          },
        },
      });

      setRfpId(res.data.uploadRFP.id);
      setStep('processing');

      // Poll for completion
      pollRFPStatus(res.data.uploadRFP.id);
    } catch (error) {
      toast.error('Failed to upload RFP');
    } finally {
      setUploading(false);
    }
  };

  const pollRFPStatus = async (id: string) => {
    const interval = setInterval(async () => {
      const res = await gql({
        query: `
          query GetRFP($id: ID!) {
            rfp(id: $id) {
              id
              status
              parsedQuestions
            }
          }
        `,
        variables: { id },
      });

      if (res.data.rfp.status === 'completed') {
        clearInterval(interval);
        setParsedQuestions(res.data.rfp.parsedQuestions);
        setStep('review');
      } else if (res.data.rfp.status === 'failed') {
        clearInterval(interval);
        toast.error('RFP processing failed');
      }
    }, 3000);
  };

  return (
    <div>
      {step === 'upload' && (
        <UploadStep
          file={file}
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
          uploading={uploading}
        />
      )}

      {step === 'processing' && (
        <ProcessingStep />
      )}

      {step === 'review' && parsedQuestions && (
        <ReviewStep
          questions={parsedQuestions}
          rfpId={rfpId!}
          onCreateProposal={() => navigate(`/proposals/new?rfpId=${rfpId}`)}
        />
      )}
    </div>
  );
};
```

## Best Practices

### 1. PDF Parsing
- **Use pdf-parse library**: Reliable text extraction
- **Handle scanned PDFs**: Use OCR (Tesseract.js) for image-based PDFs
- **Preserve structure**: Maintain headings and sections
- **Error handling**: Gracefully handle corrupted PDFs

### 2. AI Extraction
- **Structured prompts**: Clear JSON schema for consistent output
- **Temperature 0**: Deterministic extraction
- **Context limits**: Chunk large RFPs (>100 pages)
- **Validation**: Verify extracted data structure

### 3. User Experience
- **Progress indicators**: Show PDF upload and processing status
- **Review step**: Let users edit extracted questions before creating proposal
- **Preview**: Show parsed structure before commitment
- **Save drafts**: Allow saving incomplete reviews

### 4. Data Quality
- **Manual override**: Users can edit all extracted data
- **Confidence scores**: Show AI confidence for each extraction
- **Missing data**: Flag questions without limits
- **Validation**: Check for required fields

### 5. Performance
- **Async processing**: Don't block upload on processing
- **Caching**: Cache parsed PDFs
- **Background jobs**: Use BullMQ for heavy processing
- **Rate limiting**: Limit PDF uploads per organization

### 6. Security
- **File validation**: Check file type and size
- **Virus scanning**: Scan uploaded files
- **Access control**: Only organization members can access
- **Data retention**: Auto-delete old RFPs

## Usage Flow

### User Journey
1. **Upload RFP**: User uploads PDF from "Create Proposal" page
2. **Processing**: System extracts text and analyzes with AI
3. **Review**: User reviews extracted questions and limits
4. **Edit**: User can modify, add, or remove questions
5. **Generate**: System creates custom proposal template
6. **Create**: User creates proposal from generated template

### Integration Points
- **From Grants Search**: "Upload RFP" button
- **From Create Proposal**: "Import from RFP" option
- **From Templates**: "Generate from RFP" option

## Metrics to Track
- RFPs uploaded per week
- Average processing time
- Extraction accuracy (user edits)
- Conversion rate (RFP → Proposal)
- Top RFP categories

## Future Enhancements
1. **OCR for scanned PDFs**: Handle image-based documents
2. **Multi-language support**: Parse non-English RFPs
3. **Automatic grant matching**: Match RFP to grants database
4. **Compliance checking**: Compare proposal against RFP requirements
5. **Section auto-fill**: Pre-populate sections from org docs
6. **Deadline reminders**: Notify users of approaching deadlines
7. **Batch processing**: Upload multiple RFPs at once
8. **Version tracking**: Track RFP amendments

## Cost Estimation
- **Claude API**: ~$0.50-2.00 per RFP (depends on length)
- **Storage**: ~$0.01-0.10 per RFP per month
- **Processing**: Minimal compute cost

## Dependencies
```json
{
  "pdf-parse": "^1.1.1",
  "@anthropic-ai/sdk": "^0.20.0",
  "multer": "^1.4.5-lts.1"
}
```

## Testing Strategy
1. **Unit tests**: PDF extraction, AI parsing
2. **Integration tests**: Full upload → parse → generate flow
3. **E2E tests**: User journey from upload to proposal creation
4. **Test data**: Collection of sample RFPs with known structure

## Rollout Plan
1. **Phase 1**: Backend PDF upload and storage
2. **Phase 2**: AI extraction and parsing
3. **Phase 3**: Frontend upload wizard
4. **Phase 4**: Review and edit UI
5. **Phase 5**: Integration with proposal creation
6. **Phase 6**: Beta testing with real RFPs
7. **Phase 7**: Production launch

This feature will significantly reduce the time to create RFP responses from hours to minutes!
