# Grant Lifecycle Management - Strategic Plan

**Version:** 1.0
**Last Updated:** 2025-10-25
**Status:** Planning Phase

## Overview

This document outlines the comprehensive strategic plan for implementing full grant lifecycle management in the Open Agent platform. The goal is to help nonprofit organizations manage the entire grant process from discovery through impact reporting, with AI-powered assistance at every stage.

---

## Table of Contents

1. [Phase Architecture](#phase-architecture)
2. [Database Schema Extensions](#database-schema-extensions)
3. [User Experience Flows](#user-experience-flows)
4. [Notification & Reminder System](#notification--reminder-system)
5. [AI Agent as Expert Grant Advisor](#ai-agent-as-expert-grant-advisor)
6. [New Frontend Pages](#new-frontend-pages)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Key Integration Points](#key-integration-points)
9. [Success Metrics](#success-metrics)

---

## Phase Architecture

### Complete Grant Lifecycle

```
Discovery → LOI → Proposal → Submission → Award Decision → Compliance → Impact Reporting → Close-out
    ↓         ↓       ↓           ↓              ↓              ↓              ↓              ↓
  Search    Draft   Build      Track         Record         Monitor        Develop        Archive
  Grants    Intent  Full      Status         Outcome        Deadlines      Reports        Learnings
```

### Lifecycle Phases Breakdown

**Pre-Award Phase:**
1. **Grant Discovery** - Search and filter funding opportunities
2. **Letter of Intent (LOI)** - Submit initial interest (if required)
3. **Full Proposal** - Develop comprehensive application
4. **Submission** - Track submission status
5. **Award Decision** - Record outcome (awarded/not awarded)

**Post-Award Phase:**
6. **Award Setup** - Configure compliance requirements and team
7. **Compliance Monitoring** - Track deadlines and requirements
8. **Impact Reporting** - Develop and submit progress/impact reports
9. **Close-out** - Final reporting and archiving

---

## Database Schema Extensions

### New Models

#### 1. LetterOfIntent

Manages the LOI lifecycle for grants that require initial letters of intent.

```prisma
model LetterOfIntent {
  id              String   @id @default(cuid())
  organizationId  String
  grantId         String?
  title           String
  fundingAmount   Int?
  submissionDate  DateTime?
  status          LOIStatus @default(DRAFT)
  content         String?  @db.Text
  aiDraftVersion  Int      @default(0)

  organization    Organization @relation(fields: [organizationId], references: [id])
  grant           GrantOpportunity? @relation(fields: [grantId], references: [id])
  proposal        Proposal? // Can convert LOI to full proposal

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId])
  @@index([grantId])
  @@index([status])
}

enum LOIStatus {
  DRAFT
  IN_REVIEW
  SUBMITTED
  ACCEPTED      // Invited to submit full proposal
  DECLINED
  CONVERTED     // Converted to full proposal
}
```

**Purpose:**
- Track LOI drafts and submissions
- Enable LOI → Proposal conversion workflow
- Support AI-assisted LOI drafting
- Monitor LOI outcomes

---

#### 2. GrantAward

Tracks awarded grants and manages post-award lifecycle.

```prisma
model GrantAward {
  id                String   @id @default(cuid())
  proposalId        String   @unique
  awardAmount       Int
  awardDate         DateTime
  projectStartDate  DateTime
  projectEndDate    DateTime
  status            AwardStatus @default(ACTIVE)

  proposal          Proposal @relation(fields: [proposalId], references: [id])
  requirements      ComplianceRequirement[]
  reports           ImpactReport[]
  communications    GrantCommunication[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([proposalId])
  @@index([status])
  @@index([projectEndDate])
}

enum AwardStatus {
  ACTIVE
  COMPLETED
  TERMINATED
  ON_HOLD
}
```

**Purpose:**
- Store award details and project timeline
- Link to compliance requirements
- Track award lifecycle status
- Connect to impact reports

---

#### 3. ComplianceRequirement

Manages all compliance, reporting, and deliverable requirements for awarded grants.

```prisma
model ComplianceRequirement {
  id              String   @id @default(cuid())
  awardId         String
  type            RequirementType
  title           String
  description     String   @db.Text
  dueDate         DateTime
  status          ComplianceStatus @default(PENDING)
  notificationSent Boolean @default(false)
  remindersSent   Int      @default(0)
  completedDate   DateTime?

  award           GrantAward @relation(fields: [awardId], references: [id])
  documents       RequirementDocument[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([awardId])
  @@index([dueDate])
  @@index([status])
}

enum RequirementType {
  FINANCIAL_REPORT
  PROGRESS_REPORT
  IMPACT_REPORT
  AUDIT
  DOCUMENT_SUBMISSION
  SITE_VISIT
  OTHER
}

enum ComplianceStatus {
  PENDING
  IN_PROGRESS
  SUBMITTED
  APPROVED
  NEEDS_REVISION
  OVERDUE
}
```

**Purpose:**
- Track all compliance deadlines
- Support automated reminder notifications
- Monitor submission status
- Link supporting documents

**Key Features:**
- Automatic overdue detection
- Reminder tracking (prevent spam)
- Flexible requirement types
- Document attachment support

---

#### 4. ImpactReport

Builder for comprehensive impact and progress reports.

```prisma
model ImpactReport {
  id                    String   @id @default(cuid())
  awardId               String
  reportingPeriodStart  DateTime
  reportingPeriodEnd    DateTime
  status                ReportStatus @default(DRAFT)

  // Quantitative Metrics
  peopleServed          Int?
  programsDelivered     Int?
  outcomesAchieved      Json? // Flexible custom metrics storage

  // Qualitative Impact
  challenges            String? @db.Text
  successes             String? @db.Text
  storiesOfImpact       String? @db.Text
  lessonsLearned        String? @db.Text

  // Financial Summary
  financialSummary      Json? // Budget vs actual, variances

  // AI Enhancement
  aiGeneratedSummary    String? @db.Text
  aiGeneratedNarrative  String? @db.Text
  qualityScore          Int? // 0-100, AI-assessed quality

  award                 GrantAward @relation(fields: [awardId], references: [id])
  documents             ReportDocument[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  submittedAt           DateTime?

  @@index([awardId])
  @@index([status])
  @@index([reportingPeriodEnd])
}

enum ReportStatus {
  DRAFT
  IN_REVIEW
  SUBMITTED
  ACCEPTED
  NEEDS_REVISION
}
```

**Purpose:**
- Structured impact report creation
- Quantitative and qualitative data capture
- AI-enhanced narrative generation
- Version control and submission tracking

**Key Features:**
- Flexible metrics (JSON storage for custom fields)
- AI-generated executive summaries
- Quality scoring
- Document attachments (supporting evidence)

---

#### 5. GrantCommunication

Hub for all grant-related email communications with AI drafting support.

```prisma
model GrantCommunication {
  id              String   @id @default(cuid())
  awardId         String?
  proposalId      String?
  loiId           String?
  type            CommunicationType
  subject         String
  body            String   @db.Text

  // AI Assistance
  aiDrafted       Boolean  @default(false)
  aiPrompt        String?  @db.Text
  userEdited      Boolean  @default(false)

  // Email Metadata
  sentAt          DateTime?
  sentBy          String?
  recipientEmail  String?
  recipientName   String?

  award           GrantAward? @relation(fields: [awardId], references: [id])
  proposal        Proposal? @relation(fields: [proposalId], references: [id])
  loi             LetterOfIntent? @relation(fields: [loiId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([awardId])
  @@index([proposalId])
  @@index([type])
}

enum CommunicationType {
  LOI_SUBMISSION
  PROPOSAL_SUBMISSION
  FOLLOW_UP
  THANK_YOU
  STATUS_INQUIRY
  REPORT_SUBMISSION
  GENERAL
  COMPLIANCE_UPDATE
}
```

**Purpose:**
- AI-powered email drafting
- Communication history tracking
- Template management
- Professional correspondence assistance

**Key Features:**
- Type-specific templates
- Track AI vs manual drafts
- Edit history
- Multi-entity linking (LOI/Proposal/Award)

---

#### 6. Supporting Document Models

Link documents to requirements and reports.

```prisma
model RequirementDocument {
  id              String   @id @default(cuid())
  requirementId   String
  documentId      String

  requirement     ComplianceRequirement @relation(fields: [requirementId], references: [id])
  document        OrganizationDocument @relation(fields: [documentId], references: [id])

  uploadedAt      DateTime @default(now())

  @@unique([requirementId, documentId])
  @@index([requirementId])
}

model ReportDocument {
  id              String   @id @default(cuid())
  reportId        String
  documentId      String
  category        String? // e.g., "photos", "testimonials", "financials"

  report          ImpactReport @relation(fields: [reportId], references: [id])
  document        OrganizationDocument @relation(fields: [documentId], references: [id])

  uploadedAt      DateTime @default(now())

  @@unique([reportId, documentId])
  @@index([reportId])
}
```

---

### Updates to Existing Models

#### Proposal Model Extensions

Add outcome tracking and LOI linkage.

```prisma
model Proposal {
  // ... existing fields

  // LOI Integration
  loiId           String? // Link to original LOI if converted
  loi             LetterOfIntent? @relation(fields: [loiId], references: [id])

  // Outcome Tracking
  outcome         ProposalOutcome? @default(PENDING)
  outcomeDate     DateTime?
  outcomeNotes    String? @db.Text
  notAwardedReason String? @db.Text // If rejected, capture reason for learning

  // Post-Award
  award           GrantAward?
  communications  GrantCommunication[]

  @@index([outcome])
  @@index([outcomeDate])
}

enum ProposalOutcome {
  PENDING
  AWARDED
  NOT_AWARDED
  WITHDRAWN
  DECLINED_TO_APPLY
}
```

**Migration Notes:**
- Default existing proposals to `PENDING` outcome
- `loiId` and `outcomeDate` nullable for backward compatibility

---

## User Experience Flows

### Flow 1: Grant Discovery → LOI → Proposal

```
┌─────────────────────┐
│  Grants Search Page │
│  (Existing)         │
└──────────┬──────────┘
           │
           │ Click "Create LOI"
           ↓
┌─────────────────────┐
│  LOI Creation       │
│  Wizard (NEW)       │
├─────────────────────┤
│ Step 1: Grant Info  │ ← Auto-populated from grant
│ Step 2: Funding Req │
│ Step 3: AI Draft    │ ← Generate with AI
│ Step 4: Review      │
└──────────┬──────────┘
           │
           │ Submit & Status → ACCEPTED
           ↓
┌─────────────────────┐
│  Convert to Full    │
│  Proposal (NEW)     │
├─────────────────────┤
│ Pre-populated from: │
│ • LOI content       │
│ • Org context       │
│ • Document library  │
└─────────────────────┘
```

**User Journey:**
1. User discovers grant opportunity
2. Creates LOI (if grant requires it)
3. AI assists with LOI drafting
4. Submits LOI and tracks status
5. If accepted, converts to full proposal with context preserved

---

### Flow 2: Award Recording → Compliance Setup

```
┌─────────────────────┐
│  Proposal Editor    │
│  Status: SUBMITTED  │
└──────────┬──────────┘
           │
           │ Grant awarded!
           ↓
┌─────────────────────┐
│  Record Award       │
│  Dialog (NEW)       │
├─────────────────────┤
│ • Award amount      │
│ • Project dates     │
│ • Funder contact    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Compliance Setup   │
│  Wizard (NEW)       │
├─────────────────────┤
│ Step 1: Requirements│ ← Add deadlines
│ Step 2: Team Access │ ← Assign members
│ Step 3: Notifications│← Configure alerts
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Award Dashboard    │
│  (NEW)              │
└─────────────────────┘
```

**User Journey:**
1. User marks proposal as awarded
2. Enters award details
3. Sets up compliance calendar
4. Configures team and notifications
5. Manages award from dedicated dashboard

---

### Flow 3: Impact Report Creation

```
┌─────────────────────┐
│  Award Dashboard    │
└──────────┬──────────┘
           │
           │ Click "Create Impact Report"
           ↓
┌─────────────────────┐
│  Impact Report      │
│  Builder (NEW)      │
├─────────────────────┤
│ Section 1:          │
│ Reporting Period    │
├─────────────────────┤
│ Section 2:          │
│ Quantitative Metrics│
│ • People served     │
│ • Programs delivered│
│ • Custom metrics    │
├─────────────────────┤
│ Section 3:          │
│ Qualitative Impact  │
│ • Success stories   │ ← AI Enhancement
│ • Challenges        │
│ • Testimonials      │
├─────────────────────┤
│ Section 4:          │
│ Financial Summary   │
│ • Budget vs actual  │
├─────────────────────┤
│ Section 5:          │
│ AI Executive Summary│ ← Generated
└──────────┬──────────┘
           │
           │ Generate PDF / Submit
           ↓
┌─────────────────────┐
│  Report Library     │
└─────────────────────┘
```

**User Journey:**
1. User initiates report from award dashboard
2. Enters quantitative metrics
3. Writes qualitative narratives
4. AI enhances stories and generates summary
5. Reviews AI-generated executive summary
6. Exports or submits report

---

### Flow 4: Email Drafting Assistance

```
┌─────────────────────┐
│  Award Dashboard    │
│  or Proposal Page   │
└──────────┬──────────┘
           │
           │ Click "Draft Email"
           ↓
┌─────────────────────┐
│  Email Drafter      │
│  Modal (NEW)        │
├─────────────────────┤
│ 1. Select Type:     │
│    • Follow-up      │
│    • Thank you      │
│    • Status inquiry │
│    • Report submit  │
├─────────────────────┤
│ 2. Generate with AI │
├─────────────────────┤
│ 3. Edit Draft       │ ← Rich text editor
├─────────────────────┤
│ 4. Copy or Send     │
└─────────────────────┘
```

**User Journey:**
1. User clicks "Draft Email" from context
2. Selects communication type
3. AI generates professional draft
4. User edits as needed
5. Copies to clipboard or sends directly

---

## Notification & Reminder System

### New Notification Types

#### LOI Notifications

```typescript
// packages/backend/server/src/modules/notification/notification.service.ts

async notifyLOIStatusUpdate(
  loiId: string,
  newStatus: LOIStatus
): Promise<void>

async notifyLOIDeadlineApproaching(
  loiId: string,
  daysUntil: number
): Promise<void>
```

**Triggers:**
- Status changes (DRAFT → SUBMITTED, etc.)
- Deadline approaching (7 days, 3 days, 1 day)

**Recipients:** LOI creator + org admins

---

#### Award Outcome Notifications

```typescript
async notifyProposalAwarded(
  proposalId: string,
  awardAmount: number
): Promise<void>

async notifyProposalNotAwarded(
  proposalId: string,
  reason?: string
): Promise<void>
```

**Triggers:**
- Proposal outcome recorded

**Recipients:** Proposal creator + org admins

---

#### Compliance Notifications (HIGH PRIORITY)

```typescript
async notifyComplianceDeadlineApproaching(
  requirementId: string,
  daysUntil: number
): Promise<void>

async notifyComplianceOverdue(
  requirementId: string,
  daysPastDue: number
): Promise<void>

async notifyDocumentUploadRequired(
  requirementId: string
): Promise<void>

async notifyImpactReportDue(
  awardId: string,
  dueDate: Date
): Promise<void>
```

**Triggers:**
- Deadline approaching (14 days, 7 days, 3 days, 1 day)
- Requirement becomes overdue
- Status changed to IN_PROGRESS (reminder to upload docs)
- Impact report deadline approaching

**Recipients:** Award team members + org admins

---

#### Communication Notifications

```typescript
async notifyGrantCommunicationSent(
  communicationId: string
): Promise<void>

async notifyGrantCommunicationReceived(
  communicationId: string
): Promise<void>
```

**Triggers:**
- Email sent via platform
- Important email received (future integration)

**Recipients:** Relevant team members

---

#### Digest Notifications

```typescript
async sendWeeklyComplianceDigest(
  organizationId: string
): Promise<void>

async sendMonthlyImpactSummary(
  organizationId: string
): Promise<void>
```

**Content:**
- Weekly: Upcoming deadlines, overdue items, action items
- Monthly: Awards summary, impact metrics, success stories

**Recipients:** Org admins

---

### Scheduled Job System

Create new scheduler service for automated notifications.

**File:** `packages/backend/server/src/modules/notification/notification.scheduler.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Check for upcoming compliance deadlines daily at 9 AM
   */
  @Cron('0 9 * * *')
  async checkUpcomingDeadlines() {
    this.logger.log('Checking upcoming compliance deadlines...');

    const now = new Date();
    const deadlineThresholds = [14, 7, 3, 1]; // Days before deadline

    for (const days of deadlineThresholds) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);

      const requirements = await this.prisma.complianceRequirement.findMany({
        where: {
          dueDate: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lt: new Date(targetDate.setHours(23, 59, 59, 999)),
          },
          status: {
            in: ['PENDING', 'IN_PROGRESS'],
          },
          remindersSent: {
            lt: this.getReminderCount(days),
          },
        },
      });

      for (const req of requirements) {
        await this.notificationService.notifyComplianceDeadlineApproaching(
          req.id,
          days,
        );

        // Increment reminder count
        await this.prisma.complianceRequirement.update({
          where: { id: req.id },
          data: { remindersSent: { increment: 1 } },
        });
      }

      this.logger.log(
        `Sent ${requirements.length} reminders for ${days}-day threshold`,
      );
    }
  }

  /**
   * Check for overdue compliance requirements daily at 10 AM
   */
  @Cron('0 10 * * *')
  async checkOverdueRequirements() {
    this.logger.log('Checking overdue compliance requirements...');

    const now = new Date();

    const overdueRequirements = await this.prisma.complianceRequirement.findMany({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
    });

    for (const req of overdueRequirements) {
      // Update status to OVERDUE
      await this.prisma.complianceRequirement.update({
        where: { id: req.id },
        data: { status: 'OVERDUE' },
      });

      // Calculate days past due
      const daysPastDue = Math.floor(
        (now.getTime() - req.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Send escalated notification
      await this.notificationService.notifyComplianceOverdue(
        req.id,
        daysPastDue,
      );
    }

    this.logger.log(
      `Marked ${overdueRequirements.length} requirements as overdue`,
    );
  }

  /**
   * Send weekly compliance digest every Monday at 8 AM
   */
  @Cron('0 8 * * 1')
  async sendWeeklyDigests() {
    this.logger.log('Sending weekly compliance digests...');

    const organizations = await this.prisma.organization.findMany({
      where: {
        awards: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
    });

    for (const org of organizations) {
      await this.notificationService.sendWeeklyComplianceDigest(org.id);
    }

    this.logger.log(`Sent weekly digest to ${organizations.length} organizations`);
  }

  /**
   * Send monthly impact summary on 1st of month at 8 AM
   */
  @Cron('0 8 1 * *')
  async sendMonthlyReports() {
    this.logger.log('Sending monthly impact summaries...');

    const organizations = await this.prisma.organization.findMany({
      where: {
        awards: {
          some: {
            status: {
              in: ['ACTIVE', 'COMPLETED'],
            },
          },
        },
      },
    });

    for (const org of organizations) {
      await this.notificationService.sendMonthlyImpactSummary(org.id);
    }

    this.logger.log(
      `Sent monthly summary to ${organizations.length} organizations`,
    );
  }

  /**
   * Get expected reminder count based on days until deadline
   */
  private getReminderCount(daysUntil: number): number {
    const thresholds = { 14: 1, 7: 2, 3: 3, 1: 4 };
    return thresholds[daysUntil] || 0;
  }
}
```

**Configuration Required:**

```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... other imports
  ],
})
```

---

### Email Template Examples

#### Compliance Deadline Approaching

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Reuse existing email styles */
  </style>
</head>
<body>
  <div class="container">
    <h1>Compliance Deadline Approaching</h1>

    <p>Hello {{recipientName}},</p>

    <p>This is a reminder that the following compliance requirement is due in <strong>{{daysUntil}} days</strong>:</p>

    <div class="requirement-card">
      <h3>{{requirementTitle}}</h3>
      <p><strong>Type:</strong> {{requirementType}}</p>
      <p><strong>Due Date:</strong> {{dueDate}}</p>
      <p><strong>Description:</strong> {{description}}</p>
    </div>

    <p><strong>Current Status:</strong> {{status}}</p>

    {{#if documentsRequired}}
    <p>⚠️ Please upload required documents before the deadline.</p>
    {{/if}}

    <a href="{{awardDashboardUrl}}" class="button">View Award Dashboard</a>

    <p>Questions? Reply to this email or contact your grant administrator.</p>
  </div>
</body>
</html>
```

#### Weekly Compliance Digest

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Reuse existing email styles */
  </style>
</head>
<body>
  <div class="container">
    <h1>Weekly Compliance Digest</h1>

    <p>Hello {{organizationName}} team,</p>

    <p>Here's your weekly compliance summary:</p>

    <h2>🔴 Overdue ({{overdueCount}})</h2>
    <ul>
      {{#each overdueRequirements}}
      <li>
        <strong>{{title}}</strong> -
        Due {{daysOverdue}} days ago
        <a href="{{dashboardUrl}}">View</a>
      </li>
      {{/each}}
    </ul>

    <h2>⚠️ Due This Week ({{dueThisWeekCount}})</h2>
    <ul>
      {{#each dueThisWeek}}
      <li>
        <strong>{{title}}</strong> -
        Due {{dueDate}}
        <a href="{{dashboardUrl}}">View</a>
      </li>
      {{/each}}
    </ul>

    <h2>✅ Recently Completed ({{completedCount}})</h2>
    <ul>
      {{#each recentlyCompleted}}
      <li><strong>{{title}}</strong> - Completed {{completedDate}}</li>
      {{/each}}
    </ul>

    <a href="{{organizationDashboardUrl}}" class="button">View All Awards</a>
  </div>
</body>
</html>
```

---

## AI Agent as Expert Grant Advisor

### Context Management Strategy

The AI agent leverages comprehensive organizational context to provide expert, personalized grant assistance.

**File:** `packages/backend/server/src/agents/grant-advisor.agent.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeService } from '../claude/claude.service';

export interface GrantContext {
  organization: {
    profile: any;
    mission: string;
    programs: any[];
    capacity: any;
  };
  history: {
    pastProposals: any[];
    successRate: number;
    commonThemes: string[];
    avgAwardAmount: number;
  };
  grant?: {
    details: any;
    alignmentScore: number;
    matchedPrograms: string[];
  };
  documents: {
    relevant: any[];
    embeddings: any[];
  };
  compliance: {
    record: any[];
    onTimeRate: number;
  };
}

@Injectable()
export class GrantAdvisorAgent {
  private readonly logger = new Logger(GrantAdvisorAgent.name);

  constructor(
    private prisma: PrismaService,
    private claudeService: ClaudeService,
  ) {}

  /**
   * Build comprehensive context for grant-related AI operations
   */
  async buildGrantContext(
    organizationId: string,
    grantId?: string,
  ): Promise<GrantContext> {
    this.logger.log(`Building grant context for org ${organizationId}`);

    const [
      orgContext,
      organization,
      pastProposals,
      relevantDocs,
      complianceHistory,
      grant,
    ] = await Promise.all([
      this.prisma.organizationContext.findUnique({
        where: { organizationId },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
      }),
      this.getPastProposals(organizationId),
      this.findRelevantDocuments(organizationId, grantId),
      this.getComplianceHistory(organizationId),
      grantId
        ? this.prisma.grantOpportunity.findUnique({ where: { id: grantId } })
        : null,
    ]);

    const successRate = this.calculateSuccessRate(pastProposals);
    const commonThemes = await this.identifySuccessPatterns(pastProposals);
    const avgAwardAmount = this.calculateAvgAwardAmount(pastProposals);
    const onTimeRate = this.calculateOnTimeRate(complianceHistory);

    let alignmentScore = 0;
    let matchedPrograms = [];
    if (grant && orgContext) {
      const alignment = await this.calculateAlignment(orgContext, grant);
      alignmentScore = alignment.score;
      matchedPrograms = alignment.matchedPrograms;
    }

    return {
      organization: {
        profile: orgContext,
        mission: orgContext?.mission || organization?.description || '',
        programs: (orgContext?.programs as any[]) || [],
        capacity: {
          staffCount: orgContext?.staffCount,
          totalRevenue: orgContext?.totalRevenue,
        },
      },
      history: {
        pastProposals,
        successRate,
        commonThemes,
        avgAwardAmount,
      },
      grant: grant
        ? {
            details: grant,
            alignmentScore,
            matchedPrograms,
          }
        : undefined,
      documents: {
        relevant: relevantDocs,
        embeddings: [], // Populated via vector search
      },
      compliance: {
        record: complianceHistory,
        onTimeRate,
      },
    };
  }

  /**
   * Draft Letter of Intent with expert context
   */
  async draftLetterOfIntent(loiId: string): Promise<string> {
    this.logger.log(`Drafting LOI ${loiId}`);

    const loi = await this.prisma.letterOfIntent.findUnique({
      where: { id: loiId },
      include: { grant: true, organization: true },
    });

    if (!loi) {
      throw new Error('LOI not found');
    }

    const context = await this.buildGrantContext(
      loi.organizationId,
      loi.grantId,
    );

    const prompt = `You are an expert grant writer with 20+ years of experience helping nonprofit organizations secure funding. You have a proven track record of writing compelling Letters of Intent that lead to full proposal invitations.

ORGANIZATION CONTEXT:
${JSON.stringify(context.organization, null, 2)}

GRANT OPPORTUNITY:
Title: ${context.grant?.details.title}
Funder: ${context.grant?.details.funder}
Amount: $${context.grant?.details.minAmount} - $${context.grant?.details.maxAmount}
Focus Areas: ${context.grant?.details.focusAreas}
Deadline: ${context.grant?.details.deadline}

ALIGNMENT ANALYSIS:
Alignment Score: ${context.grant?.alignmentScore}/100
Matched Programs: ${context.grant?.matchedPrograms.join(', ')}

PAST SUCCESS PATTERNS:
${context.history.commonThemes.join('\n')}

TASK: Draft a compelling Letter of Intent (2-3 pages) that:
1. Captures the funder's attention immediately
2. Clearly states the funding request: $${loi.fundingAmount}
3. Demonstrates strong alignment with funder priorities
4. Highlights organization's unique qualifications
5. Provides concrete evidence of need and impact
6. Ends with a clear call to action

Use a professional, confident tone. Be specific with data and outcomes. Make it impossible for the funder to say no.`;

    const draft = await this.claudeService.generateContent(prompt);

    // Update LOI with AI draft
    await this.prisma.letterOfIntent.update({
      where: { id: loiId },
      data: {
        content: draft,
        aiDraftVersion: { increment: 1 },
      },
    });

    return draft;
  }

  /**
   * Draft grant-related email with context
   */
  async draftGrantEmail(
    type: string,
    context: {
      organizationId: string;
      proposalId?: string;
      awardId?: string;
      recipientName?: string;
      customPrompt?: string;
    },
  ): Promise<string> {
    this.logger.log(`Drafting ${type} email`);

    const grantContext = await this.buildGrantContext(context.organizationId);

    const emailTemplates = {
      FOLLOW_UP: `Draft a professional follow-up email to a grant funder. The organization submitted a proposal ${context.customPrompt || '2 weeks ago'} and wants to politely inquire about the review timeline. Tone: Professional, patient, appreciative.`,

      THANK_YOU: `Draft a gracious thank you email to a grant funder who just awarded funding. Express genuine gratitude, confirm next steps, and reinforce commitment to impact. Tone: Warm, professional, enthusiastic.`,

      STATUS_INQUIRY: `Draft a polite status inquiry email to a grant funder. The proposal has been under review and the organization wants to check on progress. Tone: Professional, respectful, not pushy.`,

      REPORT_SUBMISSION: `Draft a cover email for submitting an impact report. Briefly highlight key achievements, thank the funder for their support, and invite questions. Tone: Professional, proud but humble.`,

      LOI_SUBMISSION: `Draft a submission email for a Letter of Intent. Introduce the organization briefly, express enthusiasm about the opportunity, and confirm the LOI is attached. Tone: Professional, confident, respectful.`,

      PROPOSAL_SUBMISSION: `Draft a submission email for a full grant proposal. Express gratitude for the opportunity, briefly highlight the proposal's focus, and offer to answer questions. Tone: Professional, confident, appreciative.`,
    };

    const basePrompt =
      emailTemplates[type] ||
      'Draft a professional email related to grant management.';

    const fullPrompt = `You are an expert grant professional helping draft email communications with funders.

ORGANIZATION:
Name: ${grantContext.organization.profile?.name || 'Our Organization'}
Mission: ${grantContext.organization.mission}

RECIPIENT:
${context.recipientName ? `Name: ${context.recipientName}` : 'Title: Grant Program Officer'}

TASK:
${basePrompt}

GUIDELINES:
- Keep it concise (3-4 short paragraphs)
- Use professional but warm tone
- Personalize based on organization context
- Include specific details (not generic)
- End with clear next step or call to action
- Use proper email formatting (greeting, body, signature)

Generate the email:`;

    const draft = await this.claudeService.generateContent(fullPrompt);

    return draft;
  }

  /**
   * Enhance impact report with AI narrative
   */
  async enhanceImpactReport(reportId: string): Promise<{
    summary: string;
    narrative: string;
    qualityScore: number;
  }> {
    this.logger.log(`Enhancing impact report ${reportId}`);

    const report = await this.prisma.impactReport.findUnique({
      where: { id: reportId },
      include: {
        award: {
          include: {
            proposal: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new Error('Impact report not found');
    }

    const context = await this.buildGrantContext(
      report.award.proposal.organizationId,
    );

    const summaryPrompt = `You are an expert at communicating nonprofit impact to funders.

ORGANIZATION MISSION:
${context.organization.mission}

GRANT PROJECT:
${report.award.proposal.title}

REPORTING PERIOD:
${report.reportingPeriodStart} to ${report.reportingPeriodEnd}

QUANTITATIVE IMPACT:
- People Served: ${report.peopleServed}
- Programs Delivered: ${report.programsDelivered}
- Outcomes: ${JSON.stringify(report.outcomesAchieved)}

QUALITATIVE IMPACT:
Success Stories:
${report.storiesOfImpact}

Challenges:
${report.challenges}

Successes:
${report.successes}

TASK: Generate a compelling executive summary (250-300 words) that:
1. Opens with the most transformative impact
2. Quantifies outcomes clearly
3. Uses storytelling to bring data to life
4. Connects impact to funder's priorities
5. Acknowledges challenges authentically
6. Ends with forward-looking momentum

Make funders feel their investment changed lives.`;

    const narrativePrompt = `Based on the same context, generate a 2-3 paragraph narrative that tells the story of impact for the body of the report. Use specific examples, quotes if available, and compelling language. This should complement the executive summary with more detail and emotion.`;

    const [summary, narrative] = await Promise.all([
      this.claudeService.generateContent(summaryPrompt),
      this.claudeService.generateContent(narrativePrompt),
    ]);

    // Assess quality (simplified scoring)
    const qualityScore = this.assessReportQuality({
      ...report,
      aiGeneratedSummary: summary,
      aiGeneratedNarrative: narrative,
    });

    // Update report
    await this.prisma.impactReport.update({
      where: { id: reportId },
      data: {
        aiGeneratedSummary: summary,
        aiGeneratedNarrative: narrative,
        qualityScore,
      },
    });

    return { summary, narrative, qualityScore };
  }

  /**
   * Predict proposal success likelihood
   */
  async predictProposalSuccess(proposalId: string): Promise<{
    score: number;
    recommendations: string[];
    strengths: string[];
    weaknesses: string[];
  }> {
    // Implementation: Analyze proposal against successful patterns
    // Return success prediction and actionable recommendations
    return {
      score: 75,
      recommendations: [
        'Add more specific outcome metrics',
        'Strengthen budget narrative',
      ],
      strengths: ['Strong organizational track record', 'Clear need statement'],
      weaknesses: ['Limited evaluation plan', 'Budget lacks detail'],
    };
  }

  // Helper methods

  private async getPastProposals(organizationId: string) {
    return this.prisma.proposal.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private calculateSuccessRate(proposals: any[]): number {
    if (proposals.length === 0) return 0;
    const awarded = proposals.filter((p) => p.outcome === 'AWARDED').length;
    return Math.round((awarded / proposals.length) * 100);
  }

  private async identifySuccessPatterns(proposals: any[]): Promise<string[]> {
    // Analyze successful proposals for common themes
    // This could use AI analysis in future
    return [
      'Strong community partnerships',
      'Clear, measurable outcomes',
      'Demonstrated organizational capacity',
    ];
  }

  private calculateAvgAwardAmount(proposals: any[]): number {
    const awarded = proposals.filter((p) => p.outcome === 'AWARDED');
    if (awarded.length === 0) return 0;
    const total = awarded.reduce((sum, p) => sum + (p.requestedAmount || 0), 0);
    return Math.round(total / awarded.length);
  }

  private async findRelevantDocuments(
    organizationId: string,
    grantId?: string,
  ) {
    // Use vector search to find relevant documents
    return this.prisma.organizationDocument.findMany({
      where: { organizationId },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getComplianceHistory(organizationId: string) {
    const awards = await this.prisma.grantAward.findMany({
      where: { proposal: { organizationId } },
      include: { requirements: true },
    });

    return awards.flatMap((award) => award.requirements);
  }

  private calculateOnTimeRate(requirements: any[]): number {
    if (requirements.length === 0) return 100;
    const onTime = requirements.filter(
      (r) => r.status === 'SUBMITTED' || r.status === 'APPROVED',
    ).length;
    return Math.round((onTime / requirements.length) * 100);
  }

  private async calculateAlignment(orgContext: any, grant: any): Promise<{
    score: number;
    matchedPrograms: string[];
  }> {
    // Simplified alignment calculation
    // Could use vector embeddings for more sophisticated matching
    let score = 0;
    const matchedPrograms = [];

    // Check focus areas overlap
    const orgFocusAreas = orgContext.focusAreas || [];
    const grantFocusAreas = grant.focusAreas || [];

    const overlap = orgFocusAreas.filter((area) =>
      grantFocusAreas.includes(area),
    );
    score += overlap.length * 20;

    // Check funding amount fit
    if (
      grant.minAmount <= orgContext.totalRevenue * 0.5 &&
      grant.maxAmount >= orgContext.totalRevenue * 0.1
    ) {
      score += 20;
    }

    // Check geographic alignment
    if (
      orgContext.geographicScope === grant.geographicScope ||
      grant.geographicScope === 'National'
    ) {
      score += 20;
    }

    return {
      score: Math.min(score, 100),
      matchedPrograms,
    };
  }

  private assessReportQuality(report: any): number {
    let score = 0;

    // Check completeness
    if (report.peopleServed) score += 15;
    if (report.programsDelivered) score += 15;
    if (report.outcomesAchieved) score += 20;
    if (report.storiesOfImpact && report.storiesOfImpact.length > 100)
      score += 20;
    if (report.aiGeneratedSummary && report.aiGeneratedSummary.length > 200)
      score += 15;
    if (report.financialSummary) score += 15;

    return Math.min(score, 100);
  }
}
```

---

## New Frontend Pages

### 1. Award Dashboard

**Route:** `/proposals/:id/award`

**File:** `packages/frontend/app/src/pages/proposals/award-dashboard/AwardDashboard.tsx`

```typescript
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Loading } from '@afk/component';
import { useAwardStore } from '@/store/award';
import { AwardOverviewCard } from './components/AwardOverviewCard';
import { ComplianceCalendar } from './components/ComplianceCalendar';
import { ActivityTimeline } from './components/ActivityTimeline';
import { QuickActionsCard } from './components/QuickActionsCard';
import { UpcomingDeadlinesCard } from './components/UpcomingDeadlinesCard';
import { TeamCard } from './components/TeamCard';

export const AwardDashboard: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const { award, loading, loadAward } = useAwardStore();

  React.useEffect(() => {
    if (proposalId) {
      loadAward(proposalId);
    }
  }, [proposalId, loadAward]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  if (!award) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">No Award Found</h2>
          <p className="text-gray-600 mb-6">
            This proposal has not been marked as awarded yet.
          </p>
          <Button onClick={() => navigate(`/proposals/${proposalId}`)}>
            Back to Proposal
          </Button>
        </Card>
      </div>
    );
  }

  const upcomingRequirements = award.requirements
    ?.filter((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{award.proposal.title}</h1>
            <p className="text-gray-600">
              Awarded: ${award.awardAmount.toLocaleString()} on{' '}
              {new Date(award.awardDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/proposals/${proposalId}`)}
            >
              View Proposal
            </Button>
            <Button onClick={() => navigate(`/proposals/${proposalId}/award/settings`)}>
              Award Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Award Overview */}
          <AwardOverviewCard award={award} />

          {/* Compliance Calendar */}
          <ComplianceCalendar requirements={award.requirements || []} />

          {/* Recent Activity */}
          <ActivityTimeline activities={award.communications || []} />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Quick Actions */}
          <QuickActionsCard
            onCreateReport={() =>
              navigate(`/proposals/${proposalId}/award/impact-report/new`)
            }
            onDraftEmail={() => {
              // Open email drafter modal
            }}
            onUploadDocument={() => {
              // Open document upload modal
            }}
            onAddRequirement={() => {
              // Open add requirement modal
            }}
          />

          {/* Upcoming Deadlines */}
          <UpcomingDeadlinesCard requirements={upcomingRequirements || []} />

          {/* Team Members */}
          <TeamCard members={award.teamMembers || []} />
        </div>
      </div>
    </div>
  );
};
```

**Key Features:**
- Award overview with key metrics
- Compliance calendar with visual timeline
- Activity feed of communications and updates
- Quick actions sidebar
- Upcoming deadlines widget
- Team management

---

### 2. LOI Creator

**Route:** `/proposals/loi/new`

**File:** `packages/frontend/app/src/pages/proposals/loi/LOICreator.tsx`

```typescript
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, ProgressStepper } from '@afk/component';
import { useLOIStore } from '@/store/loi';
import { GrantSelectionStep } from './steps/GrantSelectionStep';
import { FundingRequestStep } from './steps/FundingRequestStep';
import { AIDraftStep } from './steps/AIDraftStep';
import { ReviewStep } from './steps/ReviewStep';

export const LOICreator: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const grantId = searchParams.get('grantId');

  const [currentStep, setCurrentStep] = useState(1);
  const { loi, createLOI, saveLOI } = useLOIStore();

  const steps = [
    { title: 'Grant Selection', component: GrantSelectionStep },
    { title: 'Funding Request', component: FundingRequestStep },
    { title: 'AI Draft', component: AIDraftStep },
    { title: 'Review & Submit', component: ReviewStep },
  ];

  const handleNext = async () => {
    // Save current step data
    await saveLOI();
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    await saveLOI();
    // Mark as submitted
    // Navigate to LOI detail page
    navigate(`/proposals/loi/${loi?.id}`);
  };

  const StepComponent = steps[currentStep - 1].component;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Letter of Intent</h1>
        <p className="text-gray-600">
          Draft a compelling LOI with AI assistance
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="mb-8">
        <ProgressStepper
          steps={steps.map((s) => s.title)}
          currentStep={currentStep}
        />
      </div>

      {/* Step Content */}
      <Card className="p-8">
        <StepComponent
          onNext={handleNext}
          onPrev={handlePrev}
          onSubmit={handleSubmit}
          isFirstStep={currentStep === 1}
          isLastStep={currentStep === steps.length}
        />
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 1}
        >
          Previous
        </Button>

        {currentStep < steps.length ? (
          <Button onClick={handleNext}>Next</Button>
        ) : (
          <Button onClick={handleSubmit} variant="primary">
            Submit LOI
          </Button>
        )}
      </div>
    </div>
  );
};
```

**Steps:**
1. **GrantSelectionStep** - Select grant opportunity
2. **FundingRequestStep** - Specify funding amount and project overview
3. **AIDraftStep** - Generate AI draft, review, and edit
4. **ReviewStep** - Final review and submission

---

### 3. Impact Report Builder

**Route:** `/proposals/:id/award/impact-report/:reportId`

**File:** `packages/frontend/app/src/pages/proposals/award-dashboard/ImpactReportBuilder.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  TextArea,
  DatePicker,
  Loading,
  toast,
} from '@afk/component';
import { useImpactReportStore } from '@/store/impact-report';
import { RichTextEditor } from '@/components/RichTextEditor';
import { MetricsInput } from './components/MetricsInput';
import ReactMarkdown from 'react-markdown';

export const ImpactReportBuilder: React.FC = () => {
  const { proposalId, reportId } = useParams<{
    proposalId: string;
    reportId: string;
  }>();
  const navigate = useNavigate();

  const {
    report,
    loading,
    loadReport,
    updateReport,
    generateAISummary,
    saveReport,
  } = useImpactReportStore();

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (reportId && reportId !== 'new') {
      loadReport(reportId);
    }
  }, [reportId, loadReport]);

  const handleGenerateAI = async () => {
    try {
      setIsGeneratingAI(true);
      const enhanced = await generateAISummary(reportId);
      toast.success('AI summary generated successfully!');
    } catch (error) {
      toast.error('Failed to generate AI summary');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveReport();
      toast.success('Report saved successfully!');
    } catch (error) {
      toast.error('Failed to save report');
    }
  };

  const handleSubmit = async () => {
    try {
      await saveReport();
      // Mark as submitted
      navigate(`/proposals/${proposalId}/award`);
      toast.success('Report submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Impact Report Builder</h1>
        <p className="text-gray-600">
          Document your impact with AI-enhanced narratives
        </p>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Reporting Period */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Reporting Period</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Start Date
              </label>
              <DatePicker
                value={report?.reportingPeriodStart}
                onChange={(date) =>
                  updateReport({ reportingPeriodStart: date })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <DatePicker
                value={report?.reportingPeriodEnd}
                onChange={(date) => updateReport({ reportingPeriodEnd: date })}
              />
            </div>
          </div>
        </Card>

        {/* Quantitative Metrics */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Quantitative Metrics</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                People Served
              </label>
              <Input
                type="number"
                value={report?.peopleServed || ''}
                onChange={(e) =>
                  updateReport({ peopleServed: parseInt(e.target.value) })
                }
                placeholder="Number of individuals impacted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Programs Delivered
              </label>
              <Input
                type="number"
                value={report?.programsDelivered || ''}
                onChange={(e) =>
                  updateReport({ programsDelivered: parseInt(e.target.value) })
                }
                placeholder="Number of programs completed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Custom Metrics
              </label>
              <MetricsInput
                metrics={report?.outcomesAchieved || {}}
                onChange={(metrics) => updateReport({ outcomesAchieved: metrics })}
              />
            </div>
          </div>
        </Card>

        {/* Success Stories */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Success Stories & Impact</h2>
            <Button
              variant="secondary"
              onClick={handleGenerateAI}
              disabled={isGeneratingAI}
            >
              {isGeneratingAI ? 'Generating...' : '✨ Enhance with AI'}
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Stories of Impact
              </label>
              <RichTextEditor
                value={report?.storiesOfImpact || ''}
                onChange={(value) => updateReport({ storiesOfImpact: value })}
                placeholder="Share compelling stories of how this grant changed lives..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Key Successes
              </label>
              <TextArea
                value={report?.successes || ''}
                onChange={(e) => updateReport({ successes: e.target.value })}
                placeholder="What worked well? What exceeded expectations?"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Challenges & Solutions
              </label>
              <TextArea
                value={report?.challenges || ''}
                onChange={(e) => updateReport({ challenges: e.target.value })}
                placeholder="What obstacles did you face? How did you overcome them?"
                rows={4}
              />
            </div>
          </div>
        </Card>

        {/* AI-Generated Executive Summary */}
        {report?.aiGeneratedSummary && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h2 className="text-xl font-semibold mb-4">
              AI-Generated Executive Summary
            </h2>
            <div className="prose max-w-none">
              <ReactMarkdown>{report.aiGeneratedSummary}</ReactMarkdown>
            </div>
            {report.qualityScore && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm text-gray-600">
                  Quality Score: <strong>{report.qualityScore}/100</strong>
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Financial Summary */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Financial Summary</h2>
          <p className="text-gray-600 mb-4">
            Provide a brief overview of how grant funds were used.
          </p>
          {/* Add budget vs actual component */}
        </Card>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(`/proposals/${proposalId}/award`)}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave}>
            Save Draft
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Submit Report
          </Button>
        </div>
      </div>
    </div>
  );
};
```

**Key Features:**
- Structured form for quantitative and qualitative data
- AI-enhanced narrative generation
- Executive summary auto-generation
- Quality scoring
- Draft saving and submission

---

### 4. Email Drafter Modal

**Component:** `GrantEmailDrafter`

**File:** `packages/frontend/app/src/components/GrantEmailDrafter.tsx`

```typescript
import React, { useState } from 'react';
import {
  Button,
  Select,
  Modal,
  Loading,
  toast,
} from '@afk/component';
import { useGrantCommunicationStore } from '@/store/grant-communication';
import { RichTextEditor } from './RichTextEditor';

interface GrantEmailDrafterProps {
  awardId?: string;
  proposalId?: string;
  onClose: () => void;
}

const EMAIL_TYPES = [
  { value: 'FOLLOW_UP', label: 'Follow-up Email' },
  { value: 'THANK_YOU', label: 'Thank You Email' },
  { value: 'STATUS_INQUIRY', label: 'Status Inquiry' },
  { value: 'REPORT_SUBMISSION', label: 'Report Submission Cover' },
  { value: 'LOI_SUBMISSION', label: 'LOI Submission' },
  { value: 'PROPOSAL_SUBMISSION', label: 'Proposal Submission' },
];

export const GrantEmailDrafter: React.FC<GrantEmailDrafterProps> = ({
  awardId,
  proposalId,
  onClose,
}) => {
  const [emailType, setEmailType] = useState('FOLLOW_UP');
  const [draft, setDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { generateEmail, sendEmail } = useGrantCommunicationStore();

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const generated = await generateEmail({
        type: emailType,
        awardId,
        proposalId,
      });
      setDraft(generated);
      toast.success('Email draft generated!');
    } catch (error) {
      toast.error('Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    toast.success('Copied to clipboard!');
  };

  const handleSend = async () => {
    try {
      await sendEmail({
        type: emailType,
        body: draft,
        awardId,
        proposalId,
      });
      toast.success('Email sent successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to send email');
    }
  };

  return (
    <Modal onClose={onClose} size="large">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Draft Grant Communication</h2>

        {/* Email Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Email Type</label>
          <Select
            value={emailType}
            onChange={(e) => setEmailType(e.target.value)}
            className="w-full"
          >
            {EMAIL_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Generate Button */}
        <div className="mb-6">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loading size="sm" className="mr-2" />
                Generating with AI...
              </>
            ) : (
              '✨ Generate with AI'
            )}
          </Button>
        </div>

        {/* Draft Editor */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Email Draft</label>
          <RichTextEditor
            value={draft}
            onChange={setDraft}
            placeholder="AI-generated draft will appear here. You can edit it as needed."
            minHeight="300px"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy} disabled={!draft}>
              Copy to Clipboard
            </Button>
            <Button variant="primary" onClick={handleSend} disabled={!draft}>
              Send Email
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
```

**Key Features:**
- Multiple email type templates
- AI-powered draft generation
- Rich text editing
- Copy to clipboard or send directly

---

## Implementation Roadmap

### Phase 1: Post-Award Foundation (2-3 weeks)

**Priority: HIGH**

- [ ] Database schema migration
  - [ ] Add all new models (GrantAward, ComplianceRequirement, etc.)
  - [ ] Update Proposal model with outcome tracking
  - [ ] Create indexes for performance
- [ ] Backend API development
  - [ ] Award CRUD mutations and queries
  - [ ] Compliance requirement management
  - [ ] Document linking for requirements
- [ ] Award dashboard frontend
  - [ ] Award overview component
  - [ ] Compliance calendar view
  - [ ] Activity timeline
  - [ ] Quick actions sidebar
- [ ] Document upload for requirements
  - [ ] File upload handling
  - [ ] Link documents to requirements
  - [ ] Display attached documents

**Deliverables:**
- Users can record awarded grants
- Users can set up compliance requirements
- Users can view award dashboard
- Users can upload documents for requirements

---

### Phase 2: Notification System (1-2 weeks)

**Priority: HIGH**

- [ ] Scheduled job infrastructure
  - [ ] Install @nestjs/schedule
  - [ ] Create NotificationScheduler service
  - [ ] Configure cron jobs
- [ ] New notification implementations
  - [ ] Compliance deadline approaching
  - [ ] Compliance overdue
  - [ ] Document upload required
  - [ ] Impact report due
  - [ ] Weekly compliance digest
  - [ ] Monthly impact summary
- [ ] Email templates
  - [ ] Design HTML templates
  - [ ] Test email rendering
  - [ ] Configure Resend/SMTP
- [ ] Frontend notification center
  - [ ] In-app notification bell
  - [ ] Notification list
  - [ ] Mark as read functionality

**Deliverables:**
- Automated compliance reminders
- Weekly/monthly digest emails
- In-app notification center
- Zero missed deadlines

---

### Phase 3: Impact Report Builder (2 weeks)

**Priority: HIGH**

- [ ] Database and API
  - [ ] ImpactReport model migration
  - [ ] Report CRUD mutations
  - [ ] AI enhancement endpoint
- [ ] Frontend builder
  - [ ] Multi-step report form
  - [ ] Quantitative metrics input
  - [ ] Rich text editor for narratives
  - [ ] AI summary generation UI
  - [ ] Quality score display
- [ ] AI enhancement
  - [ ] Executive summary generation
  - [ ] Narrative enhancement
  - [ ] Quality assessment logic
- [ ] Export functionality
  - [ ] PDF export
  - [ ] Word export (optional)
  - [ ] Report templates

**Deliverables:**
- Users can create structured impact reports
- AI generates compelling summaries
- Reports can be exported and submitted

---

### Phase 4: LOI Workflow (2 weeks)

**Priority: MEDIUM**

- [ ] Database and API
  - [ ] LetterOfIntent model migration
  - [ ] LOI CRUD operations
  - [ ] LOI → Proposal conversion
- [ ] Frontend LOI creator
  - [ ] Multi-step wizard
  - [ ] Grant selection
  - [ ] Funding request form
  - [ ] AI draft generation
  - [ ] Review and submission
- [ ] AI LOI drafting
  - [ ] GrantAdvisorAgent LOI method
  - [ ] Context-aware drafting
  - [ ] Template variations
- [ ] LOI management
  - [ ] LOI list view
  - [ ] Status tracking
  - [ ] Convert to proposal action

**Deliverables:**
- Users can create LOIs
- AI assists with LOI drafting
- LOIs can be converted to full proposals
- LOI status tracking

---

### Phase 5: Communication Hub (1-2 weeks)

**Priority: MEDIUM**

- [ ] Database and API
  - [ ] GrantCommunication model migration
  - [ ] Communication CRUD operations
  - [ ] AI email drafting endpoint
- [ ] Email drafter component
  - [ ] Modal component
  - [ ] Email type selection
  - [ ] AI draft generation
  - [ ] Rich text editing
  - [ ] Send/copy functionality
- [ ] Communication history
  - [ ] List of past communications
  - [ ] Filter by type
  - [ ] Search functionality
- [ ] Email templates
  - [ ] Template library
  - [ ] Template variables
  - [ ] Custom templates

**Deliverables:**
- Users can draft emails with AI assistance
- Communication history is tracked
- Professional email templates available

---

### Phase 6: Analytics & Insights (1-2 weeks)

**Priority: LOW**

- [ ] Success rate tracking
  - [ ] Proposal outcome analytics
  - [ ] Win/loss analysis
  - [ ] Success patterns identification
- [ ] Compliance health dashboard
  - [ ] On-time compliance rate
  - [ ] Overdue items summary
  - [ ] Compliance score
- [ ] Impact visualization
  - [ ] People served charts
  - [ ] Program delivery metrics
  - [ ] Financial summaries
- [ ] Funder relationship tracking
  - [ ] Funder history
  - [ ] Average award amounts
  - [ ] Relationship strength score

**Deliverables:**
- Analytics dashboard with key metrics
- Insights into grant success patterns
- Compliance health monitoring
- Data-driven grant strategy

---

## Key Integration Points

### Leveraging Existing Infrastructure

#### 1. OrganizationContext

**Location:** `OrganizationContext` model in `schema.prisma`

**Usage:** Powers all AI drafting with rich organizational profile

```typescript
// All AI operations pull org context for personalization
const orgContext = await prisma.organizationContext.findUnique({
  where: { organizationId },
});

// Context includes:
// - Mission, vision, values
// - Programs and focus areas
// - Target population
// - Capacity metrics
// - Financial data
```

**Integration:** GrantAdvisorAgent.buildGrantContext()

---

#### 2. OrganizationDocument + Embeddings

**Location:** `OrganizationDocument` and `OrganizationDocEmbedding` models

**Usage:** Semantic search for relevant past content

```typescript
// Vector search for relevant documents
const relevantDocs = await findSimilarDocuments(query, organizationId);

// Use in proposal generation, LOI drafting, report enhancement
```

**Integration:** Document library feeds AI context

---

#### 3. NotificationService

**Location:** `packages/backend/server/src/modules/notification/notification.service.ts`

**Usage:** Extend for compliance reminders and grant communications

```typescript
// Extend existing service with new notification types
async notifyComplianceDeadlineApproaching(requirementId, daysUntil) {
  // Reuse email infrastructure
  // Send via Nodemailer
  // Use existing HTML templates
}
```

**Integration:** NotificationScheduler calls NotificationService methods

---

#### 4. ProposalApproval Workflow

**Location:** `ProposalApproval` model and approval service

**Usage:** Reuse for impact report approvals

```typescript
// Impact reports can use same approval pattern
const approval = await prisma.proposalApproval.create({
  data: {
    entityType: 'ImpactReport',
    entityId: reportId,
    approverId: userId,
    status: 'PENDING',
  },
});
```

**Integration:** Add `entityType` enum value for reports

---

#### 5. Anthropic Claude SDK

**Location:** `ClaudeService` in backend

**Usage:** Expert grant advisor persona across all features

```typescript
// Consistent AI persona for:
// - LOI drafting
// - Email composition
// - Impact report enhancement
// - Success prediction
// - Recommendations
```

**Integration:** GrantAdvisorAgent wraps ClaudeService with grant-specific prompts

---

#### 6. React Hook Forms

**Location:** Used throughout existing forms

**Usage:** Consistent form experience across new pages

```typescript
// Use same patterns for:
// - LOI creation wizard
// - Impact report builder
// - Award setup forms
// - Compliance requirement forms
```

**Integration:** Maintain consistent validation and UX

---

### New Services to Create

#### Backend Services

```
packages/backend/server/src/modules/
├── award/
│   ├── award.service.ts         (Award CRUD, compliance tracking)
│   ├── award.resolver.ts        (GraphQL API)
│   └── award.module.ts
├── loi/
│   ├── loi.service.ts           (LOI lifecycle management)
│   ├── loi.resolver.ts          (GraphQL API)
│   └── loi.module.ts
├── impact-report/
│   ├── impact-report.service.ts (Report generation, AI enhancement)
│   ├── impact-report.resolver.ts (GraphQL API)
│   └── impact-report.module.ts
├── grant-communication/
│   ├── grant-communication.service.ts (Email drafting, templates)
│   ├── grant-communication.resolver.ts (GraphQL API)
│   └── grant-communication.module.ts
├── notification/
│   └── notification.scheduler.ts (Deadline monitoring, notifications)
└── agents/
    └── grant-advisor.agent.ts    (AI grant advisor)
```

#### Frontend Stores

```
packages/frontend/app/src/store/
├── award.ts                     (Award state, compliance data)
├── loi.ts                       (LOI creation, AI drafting)
├── impact-report.ts             (Report building, metrics)
└── grant-communication.ts       (Email drafting)
```

---

## Success Metrics

### User Experience Goals

| Metric | Target | Measurement |
|--------|--------|-------------|
| Complete lifecycle visibility | 100% | All phases tracked in platform |
| Missed deadlines | 0% | Notification system prevents misses |
| Time to create impact report | -50% | AI assistance reduces manual work |
| Team collaboration | 100% | All team members can access |
| AI recommendation quality | >80% | User satisfaction surveys |
| Email draft quality | >85% | User edits required <15% |
| LOI → Proposal conversion time | -40% | Pre-populated data saves time |

### Technical Goals

| Metric | Target | Measurement |
|--------|--------|-------------|
| Notification delivery rate | >99% | Email delivery logs |
| AI draft generation time | <10s | Performance monitoring |
| Page load time | <2s | Lighthouse scores |
| Email template render time | <500ms | Template engine performance |
| Database query performance | <100ms | Query profiling |
| API response time | <500ms | GraphQL tracing |
| System uptime | >99.9% | Monitoring alerts |

### Business Goals

| Metric | Target | Measurement |
|--------|--------|-------------|
| Grant success rate | +15% | Proposal outcomes tracking |
| Compliance perfect record | >95% | On-time submission rate |
| User retention | >90% | Monthly active users |
| Feature adoption | >75% | Feature usage analytics |
| Time saved per grant | 20 hours | User surveys |
| Revenue per user (SaaS) | $100/mo | Subscription metrics |

---

## Next Steps

### Immediate Actions

1. **Review and approve this plan** - Ensure alignment with vision
2. **Prioritize phases** - Confirm implementation order
3. **Allocate resources** - Assign development team
4. **Set milestones** - Define completion dates for each phase

### Getting Started

**Recommended starting point: Phase 1 (Post-Award Foundation)**

This phase provides immediate value by:
- Enabling users to track awarded grants
- Setting up compliance monitoring
- Creating foundation for future phases

**First commits:**
1. Database schema migration
2. Award service and resolver
3. Basic award dashboard page
4. Document upload for requirements

---

## Appendix

### Related Documents

- `ONBOARDING_IMPLEMENTATION_GUIDE.md` - Completed onboarding feature (Phase 1 complete)
- `PROPOSAL_SAAS_PLAN.md` - Overall product vision
- `BUDGET_GENERATION_IMPLEMENTATION.md` - Budget features

### Technologies Required

- **@nestjs/schedule** - Cron job management
- **Resend or Nodemailer** - Email delivery (already configured)
- **@anthropic-ai/sdk** - AI integration (already configured)
- **react-markdown** - Markdown rendering
- **react-pdf** or **jspdf** - PDF export
- **recharts** - Analytics visualizations (Phase 6)

### Contact

For questions about this plan, contact the development team or create an issue in the repository.

---

**End of Grant Lifecycle Management Plan**
