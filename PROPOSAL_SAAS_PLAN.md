# Non-Profit Proposal Writing SaaS - Implementation Plan

## Executive Summary

Transform the Open-Agent platform into a specialized AI-powered proposal writing SaaS for non-profits, foundations, and government grants. This platform will leverage multi-agent AI collaboration, document retrieval (RAG), and the Claude Agent SDK to help organizations write winning grant proposals.

---

## Core Features (Based on Competitive Analysis)

### 1. **AI-Powered Proposal Writing**
- Multi-agent collaboration (research, writing, editing, compliance checking)
- Claude-powered content generation with organizational context
- Template-based proposal generation
- Tone and style customization per funder
- Compliance and formatting validation

### 2. **Document Knowledge Base (RAG)**
- Upload organizational documents (mission statements, financials, past proposals, etc.)
- Semantic search across all organizational content
- Automatic context retrieval when writing proposals
- Past proposal analysis and reuse

### 3. **Grant Discovery & Research**
- Integration with grant databases (Grants.gov, Foundation Directory, etc.)
- AI-powered grant matching based on organization profile
- Automated grant deadline tracking
- Funder research and analysis

### 4. **Collaboration & Workflow**
- Multi-user workspaces per organization
- Section-based editing with assignments
- Review and approval workflows
- Version history and change tracking
- Comments and feedback threads

### 5. **Templates & Library**
- Pre-built grant proposal templates (federal, foundation, corporate)
- Section library (budget narratives, project descriptions, etc.)
- Custom template creation
- Industry-specific templates (healthcare, education, environment, etc.)

### 6. **Compliance & Quality Assurance**
- Grant requirement checklist tracking
- Automated compliance checking
- Readability and clarity scoring
- Budget validation and calculations
- Required document checklist

### 7. **Analytics & Intelligence**
- Win/loss rate tracking
- Proposal performance metrics
- Funder analysis and preferences
- Writing quality trends
- Team productivity insights

---

## Technical Architecture

### Database Schema Extensions

#### New Tables:

```prisma
// Multi-tenancy
model Organization {
  id            String    @id @default(uuid())
  name          String
  slug          String    @unique
  taxId         String?
  type          String    // nonprofit, foundation, government
  mission       String?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  workspaces    Workspace[]
  members       OrganizationMember[]
  documents     OrganizationDocument[]

  @@index([slug])
}

model OrganizationMember {
  id              String    @id @default(uuid())
  organizationId  String
  userId          String
  role            String    // owner, admin, member, viewer

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
}

model Workspace {
  id              String    @id @default(uuid())
  organizationId  String
  name            String
  description     String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  proposals       Proposal[]
  templates       ProposalTemplate[]

  @@index([organizationId])
}

// Organizational Knowledge Base
model OrganizationDocument {
  id              String    @id @default(uuid())
  organizationId  String
  title           String
  type            String    // mission, financials, past_proposal, program_description, etc.
  content         String    @db.Text
  metadata        Json
  uploadedBy      String

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  embeddings      OrganizationDocEmbedding[]

  @@index([organizationId, type])
}

model OrganizationDocEmbedding {
  id          String    @id @default(uuid())
  documentId  String
  chunk       Int
  content     String    @db.Text
  embedding   Unsupported("vector(1024)")

  document    OrganizationDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, chunk])
  @@index([embedding(ops: raw("vector_cosine_ops"))], type: Ivfflat)
}

// Proposal Management
model Proposal {
  id              String    @id @default(uuid())
  workspaceId     String
  templateId      String?

  title           String
  clientName      String?   // Funder/Foundation name
  grantId         String?   // External grant ID
  status          String    // draft, in_review, approved, submitted, awarded, rejected

  dueDate         DateTime?
  submittedAt     DateTime?
  decisionDate    DateTime?

  requestedAmount Decimal?
  awardedAmount   Decimal?

  metadata        Json      // Custom fields, requirements checklist, etc.

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  createdBy       String

  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  template        ProposalTemplate? @relation(fields: [templateId], references: [id])
  sections        ProposalSection[]
  versions        ProposalVersion[]
  approvals       ProposalApproval[]
  comments        ProposalComment[]
  aiSessions      ProposalAiSession[]

  @@index([workspaceId, status])
  @@index([createdBy])
}

model ProposalSection {
  id              String    @id @default(uuid())
  proposalId      String
  parentId        String?   // For nested sections

  title           String
  type            String    // narrative, budget, attachments, etc.
  content         String    @db.Text
  order           Int
  wordLimit       Int?

  assignedTo      String?
  completedAt     DateTime?

  metadata        Json

  proposal        Proposal  @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  parent          ProposalSection? @relation("SectionHierarchy", fields: [parentId], references: [id])
  children        ProposalSection[] @relation("SectionHierarchy")

  @@index([proposalId, order])
}

model ProposalTemplate {
  id              String    @id @default(uuid())
  workspaceId     String
  name            String
  description     String?
  category        String    // federal, foundation, corporate, custom

  isPublic        Boolean   @default(false)

  sections        TemplateSection[]
  proposals       Proposal[]

  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId, category])
}

model TemplateSection {
  id              String    @id @default(uuid())
  templateId      String
  parentId        String?

  title           String
  description     String?
  type            String
  order           Int
  wordLimit       Int?
  required        Boolean   @default(true)

  promptGuidance  String?   @db.Text  // AI prompt for this section

  template        ProposalTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  parent          TemplateSection? @relation("TemplateSectionHierarchy", fields: [parentId], references: [id])
  children        TemplateSection[] @relation("TemplateSectionHierarchy")

  @@index([templateId, order])
}

// Version Control
model ProposalVersion {
  id              String    @id @default(uuid())
  proposalId      String
  versionNumber   Int
  content         Json      // Snapshot of all sections
  createdBy       String
  createdAt       DateTime  @default(now())
  comment         String?

  proposal        Proposal  @relation(fields: [proposalId], references: [id], onDelete: Cascade)

  @@unique([proposalId, versionNumber])
  @@index([proposalId, createdAt])
}

// Approval Workflow
model ProposalApproval {
  id              String    @id @default(uuid())
  proposalId      String
  approverUserId  String
  status          String    // pending, approved, rejected, changes_requested
  comment         String?
  respondedAt     DateTime?

  createdAt       DateTime  @default(now())

  proposal        Proposal  @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  approver        User      @relation(fields: [approverUserId], references: [id])

  @@index([proposalId, status])
}

// Comments & Collaboration
model ProposalComment {
  id              String    @id @default(uuid())
  proposalId      String
  sectionId       String?
  userId          String
  content         String    @db.Text
  resolved        Boolean   @default(false)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  proposal        Proposal  @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  user            User      @relation(fields: [userId], references: [id])

  @@index([proposalId, sectionId])
}

// AI Session Linking
model ProposalAiSession {
  id              String    @id @default(uuid())
  proposalId      String
  sessionId       String
  sectionId       String?
  purpose         String    // research, writing, editing, compliance_check

  createdAt       DateTime  @default(now())

  proposal        Proposal  @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  session         AiSession @relation(fields: [sessionId], references: [id])

  @@index([proposalId])
}

// Grant Database
model GrantOpportunity {
  id              String    @id @default(uuid())
  externalId      String?   @unique
  source          String    // grants_gov, foundation_center, custom

  title           String
  funderName      String
  description     String    @db.Text
  eligibility     String    @db.Text

  category        String[]
  keywords        String[]

  minAmount       Decimal?
  maxAmount       Decimal?

  openDate        DateTime?
  closeDate       DateTime?

  url             String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([source, closeDate])
  @@index([category])
}
```

---

## AI Agent Architecture

### Multi-Agent Workflow for Proposal Writing

```typescript
// Proposal Generation Workflow
const proposalWorkflow = {
  nodes: [
    {
      id: 'research',
      type: 'copilot-chat',
      executor: 'ResearchAgent',
      model: 'claude-3-7-sonnet-20250219',
      prompt: `Research the funder and grant opportunity.
               Analyze: {grantDescription}, {funderHistory}, {pastProposals}
               Extract key requirements, priorities, and evaluation criteria.`,
      tools: ['web_search_exa', 'doc_semantic_search'],
      output: ['research_findings', 'requirements_checklist']
    },
    {
      id: 'context_retrieval',
      type: 'copilot-chat',
      executor: 'ContextAgent',
      model: 'claude-3-7-sonnet-20250219',
      prompt: `Based on requirements: {requirements_checklist}
               Search organizational knowledge base for relevant:
               - Mission alignment statements
               - Past successful proposals
               - Program descriptions
               - Financial data
               - Team qualifications`,
      tools: ['doc_semantic_search'],
      input: ['requirements_checklist'],
      output: ['relevant_context']
    },
    {
      id: 'outline',
      type: 'copilot-chat',
      executor: 'PlanningAgent',
      model: 'claude-3-7-sonnet-20250219',
      prompt: `Create a detailed proposal outline using:
               - Grant requirements: {requirements_checklist}
               - Organizational context: {relevant_context}
               - Template: {template_structure}
               Generate section-by-section plan with key points.`,
      input: ['requirements_checklist', 'relevant_context'],
      output: ['proposal_outline']
    },
    {
      id: 'write_narrative',
      type: 'copilot-chat',
      executor: 'WritingAgent',
      model: 'claude-3-7-sonnet-20250219',
      prompt: `Write proposal narrative following outline: {proposal_outline}
               Use organizational context: {relevant_context}
               Tone: Professional, compelling, mission-focused
               Ensure alignment with funder priorities.
               Max words: {word_limit}`,
      tools: ['doc_compose'],
      input: ['proposal_outline', 'relevant_context'],
      output: ['draft_narrative']
    },
    {
      id: 'compliance_check',
      type: 'copilot-chat',
      executor: 'ComplianceAgent',
      model: 'claude-3-7-sonnet-20250219',
      prompt: `Review proposal against requirements:
               - All required sections present?
               - Word limits respected?
               - Formatting compliance?
               - Required information included?
               Checklist: {requirements_checklist}`,
      tools: ['choose'],
      input: ['draft_narrative', 'requirements_checklist'],
      output: ['compliance_report']
    },
    {
      id: 'editing',
      type: 'copilot-chat',
      executor: 'EditingAgent',
      model: 'claude-3-7-sonnet-20250219',
      prompt: `Edit and refine the proposal:
               - Improve clarity and conciseness
               - Strengthen impact statements
               - Ensure consistent tone
               - Fix any compliance issues: {compliance_report}`,
      input: ['draft_narrative', 'compliance_report'],
      output: ['final_proposal']
    }
  ],
  edges: [
    { from: 'research', to: 'context_retrieval' },
    { from: 'context_retrieval', to: 'outline' },
    { from: 'outline', to: 'write_narrative' },
    { from: 'write_narrative', to: 'compliance_check' },
    { from: 'compliance_check', to: 'editing' }
  ]
};
```

### Custom AI Tools (Claude Agent SDK Skills)

#### 1. **Grant Search Tool**
```typescript
// /plugins/copilot/tools/grant-search.ts
export const grantSearchTool = {
  name: 'grant_search',
  description: 'Search for grant opportunities matching organization criteria',
  parameters: {
    keywords: 'Search keywords',
    categories: 'Grant categories (array)',
    minAmount: 'Minimum grant amount',
    maxAmount: 'Maximum grant amount',
    eligibility: 'Eligibility requirements'
  },
  execute: async (params) => {
    // Query GrantOpportunity database
    // Return matching grants with relevance scores
  }
};
```

#### 2. **Organization Context Tool**
```typescript
// /plugins/copilot/tools/org-context-search.ts
export const orgContextSearchTool = {
  name: 'org_context_search',
  description: 'Search organization knowledge base for proposal writing',
  parameters: {
    query: 'What information to retrieve',
    documentTypes: 'Types of documents to search (mission, financials, etc.)',
    topK: 'Number of results'
  },
  execute: async (params, ctx) => {
    // Semantic search in OrganizationDocEmbedding
    // Return relevant chunks with sources
  }
};
```

#### 3. **Proposal Analysis Tool**
```typescript
// /plugins/copilot/tools/proposal-analysis.ts
export const proposalAnalysisTool = {
  name: 'proposal_analysis',
  description: 'Analyze past proposals to identify winning patterns',
  parameters: {
    status: 'awarded or rejected',
    funder: 'Funder name (optional)',
    limit: 'Number of proposals to analyze'
  },
  execute: async (params, ctx) => {
    // Retrieve past proposals
    // Analyze common themes, language patterns, success factors
    // Return insights
  }
};
```

#### 4. **Compliance Checker Tool**
```typescript
// /plugins/copilot/tools/compliance-checker.ts
export const complianceCheckerTool = {
  name: 'check_compliance',
  description: 'Check proposal against grant requirements',
  parameters: {
    proposalText: 'The proposal content',
    requirements: 'Grant requirements checklist',
    wordLimits: 'Word count constraints per section'
  },
  execute: async (params) => {
    // Validate all requirements met
    // Check formatting, word counts, required sections
    // Return compliance report with issues
  }
};
```

---

## RAG (Document Retrieval) Implementation

### Context Retrieval Strategy

```typescript
// /plugins/copilot/rag/org-context-retriever.ts

export class OrganizationContextRetriever {
  async retrieveRelevantContext(
    organizationId: string,
    query: string,
    documentTypes?: string[],
    topK = 10
  ) {
    // 1. Generate query embedding
    const queryEmbedding = await this.embeddingService.embed(query);

    // 2. Vector similarity search
    const results = await this.prisma.$queryRaw`
      SELECT
        d.id,
        d.title,
        d.type,
        e.content,
        e.chunk,
        1 - (e.embedding <=> ${queryEmbedding}::vector) as similarity
      FROM "OrganizationDocEmbedding" e
      JOIN "OrganizationDocument" d ON d.id = e."documentId"
      WHERE d."organizationId" = ${organizationId}
        ${documentTypes ? Prisma.sql`AND d.type = ANY(${documentTypes})` : Prisma.empty}
      ORDER BY e.embedding <=> ${queryEmbedding}::vector
      LIMIT ${topK * 2}
    `;

    // 3. Re-rank using LLM
    const reranked = await this.rerank(query, results);

    // 4. Deduplicate and format
    return this.formatContext(reranked.slice(0, topK));
  }

  private async rerank(query: string, results: any[]) {
    // Use Claude to score relevance
    const prompt = `
      Query: ${query}

      Rank these document chunks by relevance (1-10):
      ${results.map((r, i) => `${i}. ${r.content}`).join('\n\n')}

      Return JSON array: [{"index": 0, "score": 8}, ...]
    `;

    const response = await this.aiService.generate(prompt);
    // Parse and resort results
    return sortedResults;
  }
}
```

### Embedding Pipeline

```typescript
// /plugins/copilot/rag/org-doc-embedder.ts

export class OrganizationDocumentEmbedder {
  async embedDocument(documentId: string) {
    const document = await this.prisma.organizationDocument.findUnique({
      where: { id: documentId }
    });

    // 1. Chunk document intelligently
    const chunks = this.chunkDocument(document.content, {
      maxTokens: 512,
      overlap: 50,
      preserveParagraphs: true
    });

    // 2. Generate embeddings
    const embeddings = await Promise.all(
      chunks.map(async (chunk, i) => {
        const embedding = await this.embeddingService.embed(chunk);
        return {
          documentId,
          chunk: i,
          content: chunk,
          embedding
        };
      })
    );

    // 3. Store in database
    await this.prisma.organizationDocEmbedding.createMany({
      data: embeddings
    });
  }

  private chunkDocument(text: string, options: ChunkOptions) {
    // Smart chunking: preserve semantic boundaries
    // Use sentence tokenization, paragraph boundaries
    // Implement recursive chunking for long sections
    return chunks;
  }
}
```

---

## Frontend Components

### Proposal Builder UI

```typescript
// /packages/frontend/app/src/pages/proposals/[id]/edit.tsx

export function ProposalEditor() {
  return (
    <div className="proposal-editor">
      {/* Header with status, deadline, actions */}
      <ProposalHeader proposal={proposal} />

      {/* Left sidebar: Section navigator */}
      <SectionNavigator
        sections={sections}
        onSectionSelect={setActiveSection}
      />

      {/* Main editor */}
      <SectionEditor
        section={activeSection}
        onContentChange={handleContentChange}
        aiAssist={
          <AIAssistPanel
            context={{ organizationId, proposalId, sectionId }}
            actions={[
              'Write Section',
              'Improve Clarity',
              'Check Compliance',
              'Research Funder'
            ]}
          />
        }
      />

      {/* Right sidebar: Requirements, word count, AI chat */}
      <ProposalSidebar
        requirements={proposal.metadata.requirements}
        wordCount={calculateWordCount(activeSection.content)}
        wordLimit={activeSection.wordLimit}
      />
    </div>
  );
}
```

### AI Assistant Panel

```typescript
// /packages/frontend/app/src/components/proposals/AIAssistPanel.tsx

export function AIAssistPanel({ context, actions }) {
  const [chatMode, setChatMode] = useState(false);

  return (
    <div className="ai-assist-panel">
      <div className="quick-actions">
        {actions.map(action => (
          <button
            key={action}
            onClick={() => executeAIAction(action, context)}
          >
            {action}
          </button>
        ))}
      </div>

      {chatMode && (
        <ChatInterface
          sessionType="proposal_writing"
          context={{
            proposalId: context.proposalId,
            sectionId: context.sectionId,
            organizationId: context.organizationId
          }}
          systemPrompt={`You are a grant writing expert helping with
            ${context.sectionTitle}. Use organizational context and
            grant requirements to provide relevant assistance.`}
        />
      )}
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Database schema migration
- [ ] Multi-tenancy (Organization → Workspace → Proposal)
- [ ] Update authentication to support organization membership
- [ ] Basic CRUD APIs for proposals

### Phase 2: Document Knowledge Base (Weeks 3-4)
- [ ] Organization document upload and management
- [ ] Embedding pipeline for organizational documents
- [ ] RAG retrieval implementation
- [ ] Context search API

### Phase 3: AI Agents & Tools (Weeks 5-6)
- [ ] Custom AI tools (grant search, org context, compliance)
- [ ] Multi-agent workflow for proposal generation
- [ ] Integration with Claude Agent SDK
- [ ] Prompt engineering and optimization

### Phase 4: Frontend UI (Weeks 7-8)
- [ ] Proposal builder interface
- [ ] Section-based editor
- [ ] AI assistant panel
- [ ] Collaboration features (comments, assignments)

### Phase 5: Workflow & Polish (Weeks 9-10)
- [ ] Approval workflow implementation
- [ ] Version control and history
- [ ] Grant discovery integration
- [ ] Analytics dashboard

### Phase 6: Launch Prep (Weeks 11-12)
- [ ] Testing and bug fixes
- [ ] Documentation
- [ ] Deployment setup (multi-tenant SaaS)
- [ ] Onboarding flow

---

## Competitive Features Analysis

Based on research of AI grant writing tools, here are must-have features:

### From Rogue & Competitors:
1. **Smart Templates** - Pre-built templates for different grant types
2. **Compliance Automation** - Auto-check against RFP requirements
3. **Collaboration** - Multi-user editing and review
4. **Past Proposal Library** - Learn from previous submissions
5. **Grant Matching** - Suggest relevant opportunities
6. **Budget Tools** - Budget narrative generation and validation
7. **Deadline Tracking** - Calendar and reminders
8. **Export Formats** - PDF, Word, grants.gov XML

### Unique Differentiators:
1. **Multi-Agent Intelligence** - Multiple specialized AI agents collaborating
2. **Deep RAG Integration** - Context-aware writing using org knowledge
3. **Claude 3.7 Sonnet** - Latest, most capable reasoning model
4. **Open Source Foundation** - Customizable and transparent
5. **Self-Hostable** - For organizations with strict data requirements

---

## Technical Requirements

### Dependencies to Add:
```json
{
  "@anthropic-ai/sdk": "^0.35.0",  // Claude Agent SDK
  "langchain": "^0.3.17",           // For advanced RAG
  "@langchain/anthropic": "^0.3.9",
  "pdf-lib": "^1.17.1",             // PDF generation
  "docx": "^8.5.0",                 // Word document generation
  "mammoth": "^1.8.0",              // Word → HTML conversion
  "cheerio": "^1.0.0",              // HTML parsing
  "date-fns": "^4.1.0",             // Already installed
  "zod": "^3.24.1"                  // Already installed
}
```

### Infrastructure:
- PostgreSQL 16 with pgvector extension ✅ (already configured)
- Redis for caching and job queues ✅ (already configured)
- S3/R2 for file storage ✅ (already configured)
- Additional: Elasticsearch (optional, for advanced search)

---

## Monetization Strategy

### Pricing Tiers:

1. **Free Tier**
   - 1 workspace
   - 3 proposals/month
   - Basic templates
   - 5 MB document storage

2. **Professional ($49/month)**
   - 3 workspaces
   - Unlimited proposals
   - All templates
   - 1 GB document storage
   - Collaboration (5 users)
   - Grant discovery

3. **Team ($149/month)**
   - Unlimited workspaces
   - Unlimited proposals
   - Custom templates
   - 10 GB document storage
   - Advanced collaboration (20 users)
   - Priority AI processing
   - Analytics dashboard

4. **Enterprise (Custom)**
   - Self-hosted option
   - SSO/SAML
   - Custom integrations
   - Dedicated support
   - SLA guarantees

---

## Success Metrics

### KPIs to Track:
- Proposals created per user
- Win rate improvement
- Time saved vs manual writing
- User retention rate
- AI usage patterns
- Average proposal quality score
- Template usage
- Collaboration activity

---

## Next Steps

1. Review this plan and confirm approach
2. Start with Phase 1 (database schema)
3. Set up development environment
4. Begin implementation

Would you like me to start implementing any specific phase?
