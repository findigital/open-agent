# Proposal-Writing Features by Epic & Story

## Epic Overview
- **EP-1 · Grant Intake & Readiness**: Convert external opportunities into structured workspaces with AI-assisted requirement extraction.
- **EP-2 · Proposal Authoring & AI Assistance**: Accelerate drafting with AI, templates, autosave, and contextual knowledge.
- **EP-3 · Collaboration & Governance**: Coordinate teams through comments, approvals, notifications, and versioning.
- **EP-4 · Financial Planning & Compliance**: Ensure budgets and submissions meet funder rules before handoff.
- **EP-5 · Award Delivery & Impact Reporting**: Manage awarded grants, compliance calendars, and reporting obligations end-to-end.

## EP-1 · Grant Intake & Readiness
- **Goal**: Give grant writers a unified intake hub that surfaces relevant opportunities and converts requirements into actionable work.
- **Primary Personas**: Development Director, Grant Writer, Program Lead.
- **Key Dependencies**: `grants-search.tsx`, `rfp-import.tsx`, onboarding stores, GrantService API.

| Story ID | User Story | Acceptance Cues | Key Features |
| --- | --- | --- | --- |
| US-1.1 | As a grant writer, I search and filter opportunities so I can shortlist viable grants quickly. | Keyword + advanced filters return results within 1s; cards expose amount, deadlines, categories; CTA launches proposal creation with grant ID attached. | Grants Search workspace, GraphQL `searchGrants`, analytics badges. |
| US-1.2 | As a grant writer, I upload an RFP PDF to extract sections and limits automatically. | Upload handles ≤50MB PDFs, shows progress steps, AI-generated sections editable before template generation. | RFP Import wizard, `uploadRFP` mutation, parsed requirement editor. |
| US-1.3 | As an onboarding lead, I capture org mission, programs, and capacity so AI grounding is accurate. | Multi-step onboarding saves state, surfaces readiness score, persists docs to knowledge base. | Organization onboarding flow, quality scorer service, document library integration. |
| US-1.4 | As a workspace admin, I select base templates aligned with funder type. | Template gallery previews sections, allows cloning into workspace, enforces access rules. | Templates library, TemplateService, workspace authorization guards. |

## EP-2 · Proposal Authoring & AI Assistance
- **Goal**: Deliver a focused writing environment that blends AI drafting, human editing, and contextual insights.
- **Primary Personas**: Grant Writer, Subject-Matter Expert, AI Editor.
- **Key Dependencies**: `proposal-editor.tsx`, proposal stores, `ProposalService`, AI agent services, documents library.

| Story ID | User Story | Acceptance Cues | Key Features |
| --- | --- | --- | --- |
| US-2.1 | As a grant writer, I create a proposal from a template or RFP so the right sections exist before drafting. | Creation wizard enforces required metadata, preselects template from grant/RFP, seeds sections. | Create Proposal wizard, template seeding in ProposalService. |
| US-2.2 | As a writer, I generate section content with AI using my organization’s documents. | “Generate with AI” returns content + guidance, respects word limits, logs iteration count, surfaces warnings when context thin. | AI Assistant sidebar, `generateProposalSection` mutation, embedding service. |
| US-2.3 | As an editor, I see autosave and completion state so I trust the system with in-progress work. | Edits auto-save within 2s inactivity, status badges update (saving/unsaved/saved), sections auto-complete at ≥80% word limit. | Autosave effect, section update service, completion metrics. |
| US-2.4 | As a proposal lead, I export polished documents for funders. | Export modal offers PDF/Word, triggers backend export, returns file download with success toast. | Proposal export mutation, download service, UI modal. |
| US-2.5 | As a knowledge manager, I manage document embeddings feeding AI. | Upload modal categorizes docs, triggers embedding generation, status visible, search fetches semantic results. | Documents Library, embedding CLI/service, pgvector index. |

## EP-3 · Collaboration & Governance
- **Goal**: Keep cross-functional proposal teams aligned with structured reviews and traceability.
- **Primary Personas**: Proposal Manager, Reviewer, Executive Approver.
- **Key Dependencies**: Comments UI, approvals service, notification scheduler, proposal versioning.

| Story ID | User Story | Acceptance Cues | Key Features |
| --- | --- | --- | --- |
| US-3.1 | As a reviewer, I leave section-level comments so authors can address feedback inline. | Comment drawer supports create/resolve/reopen, shows author/time, emits toast confirmations. | Comments panel, `comments-*` GraphQL mutations, notification triggers. |
| US-3.2 | As an approver, I receive requests and track pending approvals before deadlines. | Approval requests include due dates, dashboard counts pending items, reminders send via email scheduler. | Approval module, notification service, dashboard badges. |
| US-3.3 | As a compliance lead, I track proposal status changes with audit trail. | Status changes obey transition rules, history visible via timeline, unauthorized transitions blocked. | `updateProposalStatus` guard logic, status validation matrix. |
| US-3.4 | As a proposal manager, I restore previous drafts if new edits regress quality. | Versions capture content snapshots with comments, restore rehydrates sections and logs recovery comment. | ProposalVersionService, version mutations, UI restore action. |

## EP-4 · Financial Planning & Compliance
- **Goal**: Provide funder-ready budgeting tools with AI drafting and policy validation.
- **Primary Personas**: Finance Analyst, Grant Writer, Compliance Officer.
- **Key Dependencies**: `budget-builder.tsx`, BudgetService, AI budget generator, compliance validator.

| Story ID | User Story | Acceptance Cues | Key Features |
| --- | --- | --- | --- |
| US-4.1 | As a finance analyst, I build detailed line-item budgets with indirect cost rules. | Categories configurable, totals recalc instantly, MTDC excludes large equipment, indirect rate editable. | Budget builder grid, totals calculator, Zustand store. |
| US-4.2 | As a writer, I ask AI to draft a first-pass budget so I start from a baseline. | Generate with AI populates line items + narrative, warns on risky allocations, logs iteration count. | `generateBudget` mutation, AI budget orchestrator, toast feedback. |
| US-4.3 | As a compliance officer, I validate budgets against funder policies. | Validation returns pass/fail, lists issues + standards references, prompts fixes before submission. | `validateBudget` mutation, compliance rules engine. |
| US-4.4 | As a grant administrator, I export budgets for funder submission. | Export options (CSV, Excel, narrative) download successfully and reflect latest saved data. | Budget export endpoint, file download helper. |

## EP-5 · Award Delivery & Impact Reporting
- **Goal**: Ensure awarded proposals stay compliant and demonstrate impact through guided reporting.
- **Primary Personas**: Grant Manager, Program Lead, Impact Analyst.
- **Key Dependencies**: Award dashboard components, impact report wizard, award store, notification scheduler.

| Story ID | User Story | Acceptance Cues | Key Features |
| --- | --- | --- | --- |
| US-5.1 | As a grant manager, I monitor award requirements and deadlines in one place. | Award dashboard shows funding summary, compliance calendar, upcoming deadlines, quick actions. | Award dashboard, requirement tracking store, notifications. |
| US-5.2 | As a program lead, I compile impact metrics and narratives post-award. | Six-step wizard maintains autosave, quality score badge, step navigation, review gate before submission. | Impact report wizard, `impact-report` store, AI narrative helpers. |
| US-5.3 | As a grant manager, I launch impact reports directly from award milestones. | Quick action opens wizard with preloaded award context, ensures navigation back to award view. | Quick actions component, routing integration between award dashboard and wizard. |
| US-5.4 | As a communications officer, I reference AI-drafted communications history. | Award dashboard surfaces recent communications, flags AI-drafted messages with badges. | Communications list component, award store data. |

## Traceability Matrix
- Stories map to implementation artifacts to accelerate audits and future enhancements.

| Story ID | Primary Files / Modules |
| --- | --- |
| US-1.1 | `packages/frontend/app/src/pages/proposals/grants-search.tsx`, `packages/backend/server/src/modules/grant/grant.service.ts` |
| US-1.2 | `packages/frontend/app/src/pages/proposals/rfp-import.tsx`, `UploadRFP` GraphQL mutation |
| US-2.2 | `packages/frontend/app/src/pages/proposals/proposal-editor.tsx`, `packages/backend/server/src/ai/services/proposal-ai.service.ts` |
| US-3.4 | `packages/backend/server/src/modules/proposal/proposal-version.service.ts`, proposal version mutations |
| US-4.2 | `packages/frontend/app/src/pages/proposals/budget-builder.tsx`, `generateBudget` mutation |
| US-5.2 | `packages/frontend/app/src/pages/proposals/impact-report-wizard/index.tsx`, impact report store & service |

> Extend the matrix as teams add new stories or evolve modules; maintain IDs so downstream tooling (Jira, Linear, Notion) can sync automatically.

