# Custom Proposal-Writing Feature Guide

## Overview
- Purpose: document the bespoke capabilities added to transform the base Open-Agent stack into an end-to-end proposal-writing workspace.
- Scope: frontend authoring surfaces, NestJS services, AI orchestration, data stores, and supporting workflows that collectively shorten the grant lifecycle.
- Audience: product, engineering, and enablement teams who must understand how the custom library behaves and where to extend it.

## Architecture Touchpoints
- **Frontend (`packages/frontend/app`)**: React + Zustand views for proposals, budgets, awards, impact reports, onboarding, and document intake.
- **Backend (`packages/backend/server`)**: NestJS modules spanning proposals, templates, budgets, approvals, grants, documents, and AI agents.
- **AI Layer (`packages/backend/server/src/ai`)**: Claude 3.5 Sonnet multi-agent pipeline with RAG backing to draft, revise, and validate content.
- **Data**: PostgreSQL + pgvector for transactional data and embeddings, Redis for caching, object storage (via API) for uploads.
- **Infrastructure**: Dockerized deployment, GraphQL API, background schedulers for notifications and compliance tracking.

## Feature Breakdown

### Grant Discovery & Intake
- **Grants Search Workspace**
  - UI: advanced filtering, keyword search, category badges, deadline warnings.
  - Backend: `GrantService` exposes search aggregations with amount & category filters.
  - Outcome: enables proposal teams to source opportunities quickly and launch drafting directly from a grant card.

- **RFP Import Automation**
  - UI wizard guides PDF upload → AI analysis → section review → proposal kickoff.
  - Extracts questions, limits, evaluation criteria, and general requirements; user can edit before generating a template.
  - GraphQL mutation `uploadRFP` persists metadata and triggers AI parsing routines.

```30:240:packages/frontend/app/src/pages/proposals/rfp-import.tsx
// ... existing code ...
export const RFPImport = () => {
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'ready'>('upload');
  // Upload, AI analysis, human review, proposal creation flow
}
```

### Proposal Authoring Workspace
- **Proposals Dashboard**
  - Cards grouped by recency with status, success rate, funding totals, and deadline insights.
  - Quick actions support editing, duplicating, and deleting drafts.
  - Provides leadership-level visibility without leaving the authoring suite.

- **Proposal Creation Wizard**
  - Two-step flow: template selection with preview, then metadata capture (grant linkage, due dates, funding).
  - Prepopulates from grant or RFP import to reduce setup overhead.

- **Proposal Editor**
  - Three-column layout: section navigator, rich editor with auto-save, contextual sidebar (comments, AI assistant, grant facts).
  - Inline save state (saving/unsaved/saved), word-count tracking, section completion logic.
  - Integrates export actions (PDF/Word) and triggers AI generation per section.

```26:140:packages/frontend/app/src/pages/proposals/proposal-editor.tsx
// ... existing code ...
export const ProposalEditor = () => {
  // Left navigation, middle editor with autosave, right collaboration + AI sidebar
}
```

- **Templates Library**
  - Catalogue of reusable proposal skeletons (foundation, federal, corporate, research) with metadata and section previews.
  - Editors can clone templates into workspaces and customize section order/requirements.

### AI-Assisted Drafting & Compliance
- **Section Generation & Regeneration**
  - Frontend triggers `generateProposalSection` GraphQL mutation; backend orchestrates multi-agent workflow to plan, draft, edit, and comply.
  - RAG context pipeline pulls relevant organization documents via pgvector similarity search.

- **Real-time Guidance & Versioning**
  - Section updates create version snapshots using `ProposalVersionService` for auditability and rollback.
  - Auto-completion marks sections complete when word count thresholds are met.

- **Compliance Evaluation**
  - Backend validations (e.g., budget compliance, proposal requirements) expose issues, severity, and remediation suggestions.
  - Surfaced in UI as toasts or status badges so writers course-correct before submission.

```116:210:packages/backend/server/src/modules/proposal/proposal.service.ts
// ... existing code ...
async create(userId: string, input: CreateProposalInput): Promise<Proposal> {
  // Enforces workspace access, template ownership, and bootstraps sections from templates
}
```

```210:356:packages/backend/server/src/modules/proposal/proposal-section.service.ts
// ... existing code ...
async update(id: string, userId: string, input: UpdateProposalSectionInput) {
  // Applies autosave payloads, auto-completes sections based on word limits
}
```

### Collaboration & Governance
- **Comments & Threading**
  - Section-level comments with open/resolved states, timestamps, author attribution, and toast feedback loops.
  - GraphQL mutations ensure consistent real-time updates and notifications.

- **Approvals Workflow**
  - Multi-step approvals with status tracking; pending counts surfaced in proposal overview.
  - Scheduler-based reminders notify approvers before deadlines.

- **Notifications System**
  - Email alerts for approvals, comments, deadlines, and award requirements using `NotificationService` + background scheduler.

### Financial Planning & Budget Compliance
- **Budget Builder**
  - Dynamic table grouped by category with inline editing, per-line validation, indirect cost calculations, and totals recalc.
  - AI generator drafts budgets with warnings for questionable allocations; compliance validator checks against OMB guidance.
  - Exports CSV/Excel/narrative files for funder submission.

```48:344:packages/frontend/app/src/pages/proposals/budget-builder.tsx
// ... existing code ...
const generateWithAI = async () => {
  // Calls generateBudget GraphQL mutation, hydrates line items, captures warnings
}
```

### Post-Award Management & Impact Reporting
- **Award Dashboard**
  - Displays funding summary, compliance calendar, quick actions, and upcoming deadlines.
  - Supports navigation to impact reports, document uploads, and communication history.

- **Impact Report Wizard**
  - Six-step guided experience (setup → metrics → narratives → stories → documents → review) with autosave toggle, quality scoring, and status badges.
  - Reinforces post-award reporting requirements and AI-assisted narrative drafting.

```30:205:packages/frontend/app/src/pages/proposals/impact-report-wizard/index.tsx
// ... existing code ...
const STEPS = [
  { id: 'setup', title: 'Setup', component: SetupStep },
  { id: 'metrics', title: 'Metrics', component: MetricsStep },
  // ... additional steps culminating in Review & Submit
]
```

### Knowledge Base & RAG Enablement
- **Documents Library**
  - Central repository with upload modal, tagging, type filters, preview pane, and embeddings generation.
  - Upload events push files through vectorization pipeline to power AI grounding.

- **Embedding Service**
  - `EmbeddingService` batches document chunks, computes vectors, and stores them in pgvector with metadata (source, chunk index, similarity).
  - Supports organization-scoped retrieval for AI prompts.

### Analytics & Reporting
- **Dashboard Metrics**
  - Aggregates success rate, funding pipeline, proposal counts, upcoming deadlines.
  - Derived from backend computed fields (word count, completion, pending approvals) to provide real-time health signals.

- **Quality Scoring**
  - Onboarding and impact-report stores compute readiness/quality scores to guide organizations toward funder-ready submissions.

## Data Contracts & GraphQL Surface
- GraphQL schema covers proposals, sections, comments, approvals, documents, grants, budgets, awards, impact reports, and AI mutations.
- Mutations enforce workspace authorization, status transitions, and template ownership before persisting data.
- Computed fields (wordCount, completionPercentage, pendingApprovals) provide derived insights without extra client logic.

## Operational Considerations
- **Auto-Save & Draft Safety**: Debounced saves with visual state ensure writers never lose edits; backend snapshots enable restoration.
- **Compliance Guardrails**: Server-side validation prevents out-of-process status changes; budget validation catches policy issues.
- **Extensibility Hooks**: Templates, AI prompts, and budget validation rules are data-driven, allowing future customization per funder or org.
- **Deployment**: Docker compose orchestrates API, Postgres+pgvector, Redis; scripts cover migrations, seeding, embeddings generation.

## Next Steps & Roadmap Hooks
- Real-time co-authoring via WebSocket, diff visualizations, richer analytics, and permissions granularity are staged for future sprints.
- Integrations (Grants.gov, Foundation Directory, payment processing) plug into existing grant discovery and award management structures.

