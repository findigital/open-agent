# Intelligent Onboarding Feature - Comprehensive Plan

## Executive Summary

An intelligent, AI-powered onboarding process that collects organizational context through website URLs, annual reports, and program documentation. The system provides visual feedback on context completeness and quality, ensuring the platform has sufficient information to write effective grant proposals.

---

## Table of Contents

1. [User Experience Flow](#user-experience-flow)
2. [Information Architecture](#information-architecture)
3. [Visual Design & Progress Indicators](#visual-design--progress-indicators)
4. [AI Document Extraction System](#ai-document-extraction-system)
5. [Context Quality Metrics](#context-quality-metrics)
6. [Technical Implementation](#technical-implementation)
7. [Database Schema](#database-schema)
8. [Frontend Components](#frontend-components)
9. [Backend Services](#backend-services)
10. [Integration Points](#integration-points)
11. [Success Criteria](#success-criteria)

---

## 1. User Experience Flow

### 1.1 Onboarding Trigger Points

**New User Registration**
```
Sign Up → Email Verification → Welcome Screen → Onboarding
```

**Existing User - New Organization**
```
Dashboard → Add Organization → Onboarding
```

**Incomplete Profile Alert**
```
Dashboard → "Improve Proposal Quality" CTA → Onboarding
```

### 1.2 Step-by-Step User Journey

#### Step 0: Welcome & Value Proposition
**Screen**: Welcome to [Platform Name]
- **Purpose**: Set expectations and motivate completion
- **Content**:
  - Headline: "Let's Build Your Organization Profile"
  - Subheadline: "We'll use AI to learn about your organization so we can write compelling proposals tailored to your mission."
  - Visual: Animated illustration of documents → AI processing → proposal
  - Time estimate: "5-10 minutes to complete"
  - Benefits list:
    - ✓ Faster proposal writing
    - ✓ More accurate, compelling narratives
    - ✓ Automatic context for all proposals
    - ✓ Reusable across all grant applications

**CTA**: "Get Started" → Step 1

---

#### Step 1: Basic Organization Information
**Screen**: Tell Us About Your Organization
- **Purpose**: Collect essential metadata
- **Form Fields**:
  - Organization Name * (text)
  - Legal Name (if different) (text)
  - Tax ID / EIN * (text with format validation)
  - Organization Type * (select: 501(c)(3), 501(c)(4), Charity, Foundation, etc.)
  - Year Founded * (number)
  - Website URL (text with URL validation)
  - Primary Contact Email * (text)
  - Phone Number (text)
  - Address * (multi-line address input)

- **Visual Element**: Progress bar at top (Step 1 of 5)
- **Smart Features**:
  - Auto-populate legal name if same as org name (checkbox)
  - Validate EIN format (XX-XXXXXXX)
  - Fetch website metadata on URL entry (favicon, title)

**CTA**: "Continue" → Step 2

---

#### Step 2: Mission & Impact
**Screen**: Your Mission & Impact
- **Purpose**: Capture core organizational identity
- **Two Approaches**:

**Option A: Quick Upload (Recommended)**
- Upload your annual report, strategic plan, or website URL
- AI will extract mission, vision, and impact data
- Visual: Large drag-and-drop zone with icons for PDF, DOC, URL
- Supported formats: PDF, DOCX, URL

**Option B: Manual Entry**
- Mission Statement * (textarea, 500 char max)
- Vision Statement (textarea, 300 char max)
- Primary Focus Areas * (multi-select tags: Education, Health, Environment, etc.)
- Geographic Scope * (select: Local, Regional, National, International)
- Population Served * (text: "e.g., Low-income families, Youth ages 12-18")
- Annual Budget Range * (select: <$100K, $100K-$500K, $500K-$1M, $1M-$5M, $5M+)

**Smart Features**:
- If website URL provided in Step 1, show "Import from Website" button
- AI extraction shows loading state with progress messages
- After extraction, show editable pre-filled fields
- Allow switching between modes

**Visual Element**:
- Progress bar (Step 2 of 5)
- Context Quality Meter: 20% complete (just getting started)

**CTA**: "Continue" → Step 3

---

#### Step 3: Programs & Services
**Screen**: Your Programs & Impact Stories
- **Purpose**: Build deep context on what the org does
- **Layout**: Two-column interface

**Left Column: Document Upload**
- Drag-and-drop area for multiple documents
- Document types supported:
  - Program descriptions
  - Impact reports
  - Case studies
  - Evaluation reports
  - Success stories
  - Grant reports
- Shows uploaded documents with:
  - File name
  - File size
  - Processing status
  - Remove button

**Right Column: AI Extraction Preview**
- Real-time extraction results as documents process:
  ```
  ✓ Found 3 programs
  ✓ Identified 15 impact metrics
  ✓ Extracted 8 success stories
  ✓ Detected 5 outcome measurements
  ```
- Expandable sections to review extracted data
- Edit inline if needed

**Manual Entry Option** (collapsible)
- Add Program button
- For each program:
  - Program Name *
  - Description *
  - Target Population
  - Annual Participants Served
  - Key Outcomes
  - Budget Allocation

**Visual Element**:
- Progress bar (Step 3 of 5)
- Context Quality Meter: 50% complete (getting better!)
- Document processing animations

**CTA**: "Continue" → Step 4

---

#### Step 4: Organizational Capacity
**Screen**: Team & Resources
- **Purpose**: Demonstrate organizational capacity for funders
- **Sections**:

**A. Team Composition**
- Upload org chart (optional) - AI extracts structure
- OR Manual Entry:
  - Total Staff Count *
  - Full-time Staff
  - Part-time Staff
  - Volunteers
  - Board Members *
  - Key Leadership Roles (dynamically add):
    - Executive Director
    - Program Director
    - Development Director
    - etc.

**B. Financial Information**
- Upload latest annual report or Form 990 (AI extracts)
- OR Manual Entry:
  - Current Annual Operating Budget *
  - Program Expense % *
  - Administrative Expense %
  - Fundraising Expense %
  - Major Funding Sources (checkboxes):
    - Individual Donations
    - Corporate Grants
    - Foundation Grants
    - Government Grants
    - Earned Revenue
    - Other

**C. Past Grant Success**
- Have you received grants before? (Y/N)
- If yes:
  - Upload past successful proposals (AI learns from them)
  - OR list major grants:
    - Funder name
    - Grant amount
    - Year
    - Purpose

**Visual Element**:
- Progress bar (Step 4 of 5)
- Context Quality Meter: 75% complete (almost there!)

**CTA**: "Continue" → Step 5

---

#### Step 5: AI Context Processing & Review
**Screen**: Building Your Organization Profile
- **Purpose**: Process all documents with AI, show progress, allow review
- **Layout**: Full-screen processing experience

**Phase 1: Processing (30-90 seconds)**
```
Visual: Animated brain/AI graphic with progress steps

Processing your documents...
✓ Extracting mission and vision (completed)
✓ Identifying programs and services (completed)
⟳ Analyzing impact metrics (in progress)
○ Building organizational timeline
○ Creating context embeddings
○ Generating profile summary

Processed: 8 of 12 documents
```

**Phase 2: Review & Validate**
```
Your Organization Profile - Ready for Review

[Visual: Dashboard-style summary with edit buttons]

Organization Identity
✓ Mission Statement (86% confidence)
✓ Vision Statement (92% confidence)
✓ 5 Focus Areas identified
[Edit] [Looks Good]

Programs & Services
✓ 4 Programs extracted
✓ 23 Impact metrics found
✓ 12 Success stories identified
[Review Details] [Add More]

Organizational Capacity
✓ Team structure (15 staff members)
✓ Financial data (last 3 years)
✓ 8 Past grants documented
[Review Details] [Add More]

Context Quality Score: 87/100 (Excellent!)
```

**Context Quality Visualization**:
```
[==============================87%==============] 87/100

Quality Breakdown:
■■■■■■■■■■ Mission & Identity: 95/100 (Excellent)
■■■■■■■■□□ Programs & Impact: 85/100 (Good)
■■■■■■■■■□ Organizational Capacity: 90/100 (Excellent)
■■■■■□□□□□ Past Proposals: 60/100 (Could be better)

Recommendations to improve:
+ Upload more program impact data (+10 points)
+ Add past successful proposals (+15 points)
+ Include board member bios (+5 points)
```

**Visual Element**:
- Progress bar (Step 5 of 5) - Complete!
- Large context quality meter with score
- Confetti animation when score > 80

**CTA Options**:
- "Looks Good - Finish Onboarding" → Dashboard
- "Add More Information" → Back to relevant step
- "Skip for Now" → Dashboard (with reminder)

---

#### Step 6: Success & Next Steps
**Screen**: You're All Set! 🎉
- **Purpose**: Celebrate completion, guide next actions
- **Content**:
  - Success message: "Your organization profile is ready!"
  - Context Quality Score display (large, prominent)
  - What happens next:
    - "Your organization context is now embedded and ready"
    - "Our AI will use this information in every proposal"
    - "You can update your profile anytime"

**Quick Start Options** (3 cards):
1. **Create Your First Proposal**
   - Icon: Document with sparkles
   - "Start from a template or import an RFP"
   - CTA: "Create Proposal"

2. **Search for Grants**
   - Icon: Magnifying glass with dollar sign
   - "Find funding opportunities that match your mission"
   - CTA: "Browse Grants"

3. **Import More Documents**
   - Icon: Upload cloud
   - "Add more context to improve proposal quality"
   - CTA: "Upload Documents"

**Visual Element**:
- Celebration illustration
- Context Quality badge (Bronze/Silver/Gold based on score)

**CTA**: "Go to Dashboard"

---

## 2. Information Architecture

### 2.1 Data Collection Strategy

**Critical Context Categories**:

1. **Organization Identity** (Priority: Critical)
   - Legal information
   - Mission/Vision
   - Focus areas
   - Geographic scope
   - Population served

2. **Programs & Services** (Priority: Critical)
   - Program descriptions
   - Target populations
   - Outcomes/Impact
   - Success stories
   - Evaluation data

3. **Organizational Capacity** (Priority: High)
   - Staff structure
   - Board composition
   - Financial health
   - Past grant success

4. **Impact Evidence** (Priority: High)
   - Metrics and KPIs
   - Success stories
   - Testimonials
   - Case studies
   - Evaluation reports

5. **Historical Context** (Priority: Medium)
   - Past proposals
   - Grant reports
   - Annual reports
   - Strategic plans

### 2.2 Document Type Taxonomy

**Primary Documents** (highest value):
- Annual Reports
- Strategic Plans
- Form 990s
- Audited Financials

**Program Documents**:
- Program Descriptions
- Logic Models
- Evaluation Reports
- Impact Studies

**Marketing Materials**:
- Website content
- Brochures
- Case studies
- Success stories

**Grant-Related**:
- Past proposals
- Grant reports
- Letters of support
- Award letters

### 2.3 Content Extraction Priorities

**Tier 1 - Must Have** (Block completion if missing):
- Organization name, EIN, type
- Mission statement
- At least 1 program description
- Basic financial data

**Tier 2 - Should Have** (Warn if missing):
- Vision statement
- Impact metrics
- Staff structure
- Past grant history

**Tier 3 - Nice to Have** (Suggest adding):
- Success stories
- Testimonials
- Board bios
- Strategic plans

---

## 3. Visual Design & Progress Indicators

### 3.1 Context Quality Meter Design

**Visual Representation**:

```
┌─────────────────────────────────────────────────────────┐
│  Organization Context Quality                           │
│                                                          │
│  ████████████████████████████░░░░░░░░░░  87/100         │
│                                                          │
│  Excellent - Ready to write compelling proposals!       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Identity     │  │ Programs     │  │ Capacity     │  │
│  │ ██████ 95%   │  │ █████░ 85%   │  │ ██████ 90%   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  Missing:                                                │
│  → Past successful proposals (+15 points)                │
│  → Board member information (+5 points)                  │
│                                                          │
│  [Add More Context]                                      │
└─────────────────────────────────────────────────────────┘
```

**Score Ranges & Labels**:
- 0-40: "Getting Started" (Red) - Basic information only
- 41-60: "Fair" (Orange) - Minimal context, proposals will need heavy editing
- 61-80: "Good" (Yellow) - Solid context, proposals will be helpful
- 81-90: "Excellent" (Light Green) - Rich context, high-quality proposals
- 91-100: "Outstanding" (Dark Green) - Comprehensive context, exceptional proposals

**Visual Indicators**:
- Animated progress on upload
- Pulse effect when score increases
- Confetti when reaching "Excellent"
- Badge icons (🥉🥈🥇) for achievement levels

### 3.2 Document Processing Animations

**Upload State**:
```
┌────────────────────────────────────┐
│  📄 annual-report-2024.pdf         │
│  ⟳ Processing... 45%               │
│  Extracting organizational data    │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░              │
└────────────────────────────────────┘
```

**Processed State**:
```
┌────────────────────────────────────┐
│  ✓ annual-report-2024.pdf          │
│  Found: 12 programs, 45 metrics    │
│  [View Extracted Data] [Remove]    │
└────────────────────────────────────┘
```

**Extraction Preview**:
```
┌────────────────────────────────────┐
│  AI Extracted Information          │
│                                     │
│  ✓ Mission Statement               │
│  "To empower youth through..."     │
│  [Edit] [Accept]                   │
│                                     │
│  ✓ Programs Found (3)              │
│  • Youth Leadership Program        │
│  • After-School Tutoring           │
│  • Summer STEM Camp                │
│  [Review All]                      │
│                                     │
│  ✓ Impact Metrics (8)              │
│  • 500 youth served annually       │
│  • 85% college enrollment rate     │
│  [View All Metrics]                │
└────────────────────────────────────┘
```

### 3.3 Progress Tracking Components

**Step Indicator** (top of every screen):
```
Step 1        Step 2        Step 3        Step 4        Step 5
  ●────────────●────────────●────────────○────────────○
Basic Info   Mission     Programs     Capacity    Review
```

**Side Panel - Always Visible**:
```
┌──────────────────────┐
│ Your Progress        │
│                      │
│ ✓ Basic Info         │
│ ✓ Mission & Impact   │
│ ⟳ Programs (67%)     │
│ ○ Capacity           │
│ ○ Review             │
│                      │
│ ──────────────────── │
│                      │
│ Context Quality      │
│ ███░░░░░░░ 42%       │
│                      │
│ [Save & Exit]        │
└──────────────────────┘
```

---

## 4. AI Document Extraction System

### 4.1 Extraction Pipeline

**Phase 1: Document Processing**
```
Upload → File Type Detection → Text Extraction → Chunking
```

**Phase 2: AI Analysis**
```
Chunks → Embedding → Classification → Entity Extraction → Validation
```

**Phase 3: Structuring**
```
Extracted Data → Confidence Scoring → Deduplication → Storage
```

### 4.2 AI Prompts for Extraction

#### Mission Statement Extraction Prompt
```
You are analyzing a nonprofit organization's document to extract their mission statement.

Document excerpt:
{document_text}

Extract the following:
1. Mission Statement - The organization's primary purpose (1-3 sentences)
2. Vision Statement - Their aspirational future state (1-2 sentences)
3. Values - Core organizational values (list)
4. Focus Areas - Primary issue areas or populations served (list)

Return as JSON:
{
  "mission": "...",
  "vision": "...",
  "values": ["...", "..."],
  "focus_areas": ["...", "..."],
  "confidence": 0.85
}

Only extract explicit statements. If not found, return null for that field.
```

#### Program Extraction Prompt
```
You are analyzing a document to extract nonprofit program information.

Document excerpt:
{document_text}

Extract all programs/services mentioned. For each program:
1. Program Name
2. Description (2-3 sentences)
3. Target Population
4. Geographic Scope
5. Impact Metrics (numbers served, outcomes, etc.)
6. Key Activities

Return as JSON array:
[
  {
    "name": "...",
    "description": "...",
    "target_population": "...",
    "geographic_scope": "...",
    "metrics": ["...", "..."],
    "activities": ["...", "..."],
    "confidence": 0.92
  }
]
```

#### Financial Data Extraction Prompt
```
You are analyzing financial documents (annual report, 990, etc.) to extract key financial metrics.

Document excerpt:
{document_text}

Extract:
1. Total Revenue (most recent fiscal year)
2. Total Expenses
3. Program Expenses (amount and %)
4. Administrative Expenses (amount and %)
5. Fundraising Expenses (amount and %)
6. Net Assets
7. Major Funding Sources (list with amounts if available)
8. Fiscal Year End Date

Return as JSON with confidence scores.
```

#### Impact Metrics Extraction Prompt
```
You are analyzing documents to extract measurable impact metrics and outcomes.

Document excerpt:
{document_text}

Extract all quantifiable metrics and outcomes:
- Number of people served
- Percentage improvements
- Award/recognition data
- Outcome measurements
- Success rates
- Geographic reach

For each metric provide:
{
  "metric": "500 youth served",
  "category": "reach",
  "value": 500,
  "unit": "youth",
  "timeframe": "annually",
  "confidence": 0.95
}

Return array of all metrics found.
```

### 4.3 Website Scraping Strategy

**Multi-Page Analysis**:
1. Homepage (mission, overview)
2. About page (history, mission, team)
3. Programs page (services offered)
4. Impact/Results page (metrics, stories)
5. Team/Leadership page (staff, board)

**Scraping Rules**:
- Follow robots.txt
- Respect rate limits (1 page/second)
- Maximum 10 pages per domain
- Extract structured data (JSON-LD, microdata)
- Clean HTML → Markdown conversion

**Content Prioritization**:
- `<h1>` Mission statements
- `<article>` Program descriptions
- `<section class="impact">` Metrics
- `<div class="team">` Staff information

### 4.4 Confidence Scoring

**Confidence Calculation**:
```typescript
interface ConfidenceFactors {
  sourceQuality: number;      // 0-1: Official doc = 1.0, website = 0.8
  extractionCertainty: number; // 0-1: From AI model
  dataCompleteness: number;   // 0-1: How complete is extraction
  crossValidation: number;    // 0-1: Confirmed by multiple sources
}

finalConfidence = (
  sourceQuality * 0.3 +
  extractionCertainty * 0.4 +
  dataCompleteness * 0.2 +
  crossValidation * 0.1
)
```

**Display Logic**:
- Confidence > 0.85: Show as verified ✓
- Confidence 0.70-0.85: Show with "Review suggested"
- Confidence < 0.70: Flag for manual review

### 4.5 Deduplication & Merging

**Scenario**: Same information from multiple sources
- Annual report says: "We served 500 youth in 2024"
- Website says: "500+ young people annually"

**Merge Strategy**:
1. Use source with higher confidence
2. If similar confidence, prefer more recent source
3. Keep both if materially different
4. Flag conflicts for user review

---

## 5. Context Quality Metrics

### 5.1 Scoring Algorithm

**Overall Score (0-100)**:

```typescript
interface QualityScore {
  identity: number;      // 0-100
  programs: number;      // 0-100
  capacity: number;      // 0-100
  impact: number;        // 0-100
}

// Weighted calculation
overallScore = (
  identity * 0.30 +      // Mission is most critical
  programs * 0.35 +      // Programs are core to proposals
  capacity * 0.20 +      // Capacity demonstrates readiness
  impact * 0.15          // Impact proves effectiveness
)
```

**Identity Score Components**:
- Mission statement exists: 40 points
- Vision statement exists: 15 points
- Focus areas defined (≥3): 20 points
- Geographic scope defined: 10 points
- Target population defined: 15 points

**Programs Score Components**:
- At least 1 program described: 30 points
- 2-3 programs: +20 points
- 4+ programs: +30 points
- Impact metrics per program: +10 points each
- Success stories: +10 points each (max 30)

**Capacity Score Components**:
- Staff count provided: 20 points
- Leadership team described: 25 points
- Board information: 15 points
- Financial data (1 year): 20 points
- Financial data (3 years): +20 points

**Impact Score Components**:
- Quantified outcomes (≥5): 40 points
- Success stories (≥3): 30 points
- External validation (awards, etc.): 20 points
- Evaluation reports: 10 points

### 5.2 Completeness Indicators

**Per-Category Indicators**:

```
Identity: ████████░░ 82%
✓ Mission statement
✓ Vision statement
✓ 5 focus areas
✗ Missing: Geographic scope details

Programs: ██████░░░░ 65%
✓ 3 programs described
✓ 12 impact metrics
△ 1 success story (add 2 more for full credit)
✗ Missing: Program budgets

Capacity: █████████░ 90%
✓ Staff structure (18 members)
✓ Board composition
✓ 3 years financial data
✓ Past grant history

Impact: ███████░░░ 72%
✓ 8 quantified outcomes
✓ 2 success stories
△ Add evaluation reports (+10%)
△ Add external validation (+18%)
```

### 5.3 Recommendation Engine

**Smart Suggestions Based on Score**:

```typescript
interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  benefit: string;
  pointsGain: number;
  estimatedTime: string;
}

// Example recommendations
[
  {
    priority: 'critical',
    action: 'Add your mission statement',
    benefit: 'Essential for all proposals',
    pointsGain: 40,
    estimatedTime: '2 minutes'
  },
  {
    priority: 'high',
    action: 'Upload annual report or Form 990',
    benefit: 'Provides financial credibility',
    pointsGain: 25,
    estimatedTime: '5 minutes'
  },
  {
    priority: 'medium',
    action: 'Add 2 more success stories',
    benefit: 'Makes proposals more compelling',
    pointsGain: 15,
    estimatedTime: '10 minutes'
  }
]
```

---

## 6. Technical Implementation

### 6.1 Technology Stack

**Frontend**:
- React with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- React Hook Form for form management
- React Dropzone for file uploads
- React Circular Progressbar for quality meter

**Backend**:
- NestJS (existing)
- Anthropic Claude API for extraction
- Puppeteer/Playwright for web scraping
- PDF-parse for PDF extraction
- Mammoth for DOCX extraction
- Bull Queue for async processing

**Storage**:
- PostgreSQL (existing) for structured data
- pgvector (existing) for embeddings
- S3/Blob storage for document files

### 6.2 API Endpoints

**Onboarding Flow**:
```typescript
POST   /api/onboarding/start
POST   /api/onboarding/basic-info
POST   /api/onboarding/mission
POST   /api/onboarding/programs
POST   /api/onboarding/capacity
POST   /api/onboarding/complete
GET    /api/onboarding/status
PATCH  /api/onboarding/skip-step
```

**Document Processing**:
```typescript
POST   /api/onboarding/documents/upload
GET    /api/onboarding/documents/:id/status
GET    /api/onboarding/documents/:id/extracted
PATCH  /api/onboarding/documents/:id/validate
DELETE /api/onboarding/documents/:id
```

**Website Import**:
```typescript
POST   /api/onboarding/import-website
GET    /api/onboarding/import-website/:jobId/status
GET    /api/onboarding/import-website/:jobId/results
```

**Context Quality**:
```typescript
GET    /api/onboarding/quality-score
GET    /api/onboarding/recommendations
PATCH  /api/onboarding/accept-extraction
```

### 6.3 Data Flow

**Document Upload Flow**:
```
1. User uploads file → Frontend validates size/type
2. File sent to backend → Stored in blob storage
3. Job queued for processing → Bull Queue
4. Worker picks up job:
   a. Extract text from document
   b. Chunk text (2000 tokens per chunk)
   c. Send chunks to Claude for extraction
   d. Parse structured responses
   e. Calculate confidence scores
   f. Create embeddings
   g. Store in database
5. Frontend polls for status updates
6. When complete, show extracted data for review
7. User validates/edits → Update database
8. Recalculate quality score
```

**Website Scraping Flow**:
```
1. User enters URL → Validate domain
2. Queue scraping job
3. Worker:
   a. Fetch robots.txt
   b. Crawl homepage + key pages
   c. Extract content (HTML → Markdown)
   d. Send to Claude for analysis
   e. Extract structured data
4. Return results for preview
5. User accepts → Store in database
```

---

## 7. Database Schema

### 7.1 New Tables

```prisma
model OnboardingProgress {
  id             String   @id @default(uuid())
  organizationId String   @unique @map("organization_id")
  userId         String   @map("user_id")
  currentStep    Int      @default(1) @map("current_step")
  completedSteps Json     @default("[]") @map("completed_steps")
  qualityScore   Int      @default(0) @map("quality_score")
  isComplete     Boolean  @default(false) @map("is_complete")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  completedAt    DateTime? @map("completed_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([userId])
  @@map("onboarding_progress")
}

model OnboardingDocument {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  fileName       String   @map("file_name")
  fileType       String   @map("file_type")
  fileSize       Int      @map("file_size")
  storageUrl     String   @map("storage_url")
  documentType   String   @map("document_type") // annual_report, program_doc, etc.
  processingStatus String @default("pending") @map("processing_status")
  extractedData  Json?    @map("extracted_data")
  confidence     Decimal? @db.Decimal(3, 2)
  uploadedBy     String   @map("uploaded_by")
  createdAt      DateTime @default(now()) @map("created_at")
  processedAt    DateTime? @map("processed_at")

  @@index([organizationId])
  @@index([processingStatus])
  @@map("onboarding_documents")
}

model OrganizationContext {
  id             String   @id @default(uuid())
  organizationId String   @unique @map("organization_id")

  // Identity
  mission        String?  @db.Text
  vision         String?  @db.Text
  values         String[] @db.VarChar
  focusAreas     String[] @map("focus_areas") @db.VarChar
  geographicScope String? @map("geographic_scope") @db.VarChar
  targetPopulation String? @map("target_population") @db.Text

  // Programs
  programs       Json     @default("[]")

  // Capacity
  staffCount     Int?     @map("staff_count")
  boardCount     Int?     @map("board_count")
  leadership     Json?

  // Impact
  impactMetrics  Json     @default("[]") @map("impact_metrics")
  successStories Json     @default("[]") @map("success_stories")

  // Quality Scores
  identityScore  Int      @default(0) @map("identity_score")
  programsScore  Int      @default(0) @map("programs_score")
  capacityScore  Int      @default(0) @map("capacity_score")
  impactScore    Int      @default(0) @map("impact_score")
  overallScore   Int      @default(0) @map("overall_score")

  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@map("organization_context")
}

model WebsiteImportJob {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")
  websiteUrl     String   @map("website_url")
  status         String   @default("pending") // pending, scraping, processing, completed, failed
  pagesScraped   Int      @default(0) @map("pages_scraped")
  extractedData  Json?    @map("extracted_data")
  errorMessage   String?  @map("error_message") @db.Text
  createdAt      DateTime @default(now()) @map("created_at")
  completedAt    DateTime? @map("completed_at")

  @@index([organizationId])
  @@index([status])
  @@map("website_import_jobs")
}
```

### 7.2 Extended Organization Model

```prisma
model Organization {
  // ... existing fields ...

  onboardingProgress OnboardingProgress?
  context            OrganizationContext?
  onboardingDocuments OnboardingDocument[]
  websiteImportJobs   WebsiteImportJob[]
}
```

---

## 8. Frontend Components

### 8.1 Component Hierarchy

```
OnboardingWizard/
├── OnboardingLayout
│   ├── ProgressHeader
│   │   ├── StepIndicator
│   │   └── QualityMeterMini
│   └── SidePanel
│       ├── StepList
│       └── QualityMeterFull
│
├── Steps/
│   ├── WelcomeStep
│   ├── BasicInfoStep
│   │   └── OrganizationForm
│   ├── MissionStep
│   │   ├── UploadOption
│   │   │   └── DocumentDropzone
│   │   └── ManualEntryOption
│   │       └── MissionForm
│   ├── ProgramsStep
│   │   ├── DocumentUploadPanel
│   │   │   ├── DocumentDropzone
│   │   │   └── UploadedDocumentsList
│   │   ├── ExtractionPreviewPanel
│   │   │   └── ExtractedDataCard
│   │   └── ManualProgramEntry
│   ├── CapacityStep
│   │   ├── TeamSection
│   │   ├── FinancialSection
│   │   └── GrantHistorySection
│   ├── ReviewStep
│   │   ├── ProcessingAnimation
│   │   ├── ProfileSummary
│   │   │   ├── IdentitySummaryCard
│   │   │   ├── ProgramsSummaryCard
│   │   │   └── CapacitySummaryCard
│   │   └── QualityScoreDisplay
│   └── SuccessStep
│       ├── CelebrationAnimation
│       ├── QualityBadge
│       └── NextStepsCards
│
└── Shared/
    ├── QualityMeter
    ├── DocumentProcessingCard
    ├── ExtractionPreview
    ├── ConfidenceIndicator
    └── EditableExtractedField
```

### 8.2 Key Component Specifications

#### QualityMeter Component

```typescript
interface QualityMeterProps {
  score: number;
  breakdown?: {
    identity: number;
    programs: number;
    capacity: number;
    impact: number;
  };
  size?: 'small' | 'medium' | 'large';
  showRecommendations?: boolean;
}

// Usage
<QualityMeter
  score={87}
  breakdown={{
    identity: 95,
    programs: 85,
    capacity: 90,
    impact: 78
  }}
  size="large"
  showRecommendations={true}
/>
```

#### DocumentDropzone Component

```typescript
interface DocumentDropzoneProps {
  onUpload: (files: File[]) => Promise<void>;
  acceptedTypes: string[];
  maxSize: number;
  maxFiles?: number;
  documentType?: string;
}

// Usage
<DocumentDropzone
  onUpload={handleDocumentUpload}
  acceptedTypes={['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
  maxSize={10 * 1024 * 1024} // 10MB
  maxFiles={5}
  documentType="annual_report"
/>
```

#### ExtractionPreview Component

```typescript
interface ExtractionPreviewProps {
  documentId: string;
  extractedData: ExtractedData;
  onAccept: (data: ExtractedData) => void;
  onEdit: (field: string, value: any) => void;
  onReject: () => void;
}

interface ExtractedData {
  mission?: { value: string; confidence: number };
  vision?: { value: string; confidence: number };
  programs?: Array<{ name: string; description: string; confidence: number }>;
  // ... more fields
}
```

---

## 9. Backend Services

### 9.1 OnboardingService

```typescript
@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private documentProcessor: DocumentProcessorService,
    private qualityScorer: QualityScorerService,
    private embeddingService: EmbeddingService
  ) {}

  async startOnboarding(userId: string, organizationId: string): Promise<OnboardingProgress>

  async saveBasicInfo(organizationId: string, data: BasicInfoInput): Promise<void>

  async saveMission(organizationId: string, data: MissionInput): Promise<void>

  async uploadDocument(organizationId: string, file: Express.Multer.File, type: string): Promise<OnboardingDocument>

  async getQualityScore(organizationId: string): Promise<QualityScore>

  async getRecommendations(organizationId: string): Promise<Recommendation[]>

  async completeOnboarding(organizationId: string): Promise<void>
}
```

### 9.2 DocumentProcessorService

```typescript
@Injectable()
export class DocumentProcessorService {
  constructor(
    private anthropic: Anthropic,
    private embeddingService: EmbeddingService,
    private queue: Queue
  ) {}

  async processDocument(documentId: string): Promise<ExtractedData> {
    // 1. Extract text from file
    const text = await this.extractText(documentId);

    // 2. Chunk text
    const chunks = this.chunkText(text, 2000);

    // 3. Extract data with Claude
    const extractedData = await this.extractWithAI(chunks);

    // 4. Calculate confidence
    const withConfidence = this.calculateConfidence(extractedData);

    // 5. Create embeddings
    await this.embeddingService.createDocumentEmbeddings(documentId, chunks);

    // 6. Store results
    await this.saveExtractedData(documentId, withConfidence);

    return withConfidence;
  }

  private async extractWithAI(chunks: string[]): Promise<any> {
    const results = [];

    for (const chunk of chunks) {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: this.buildExtractionPrompt(chunk)
        }]
      });

      results.push(this.parseAIResponse(response));
    }

    return this.mergeResults(results);
  }

  private buildExtractionPrompt(text: string): string {
    // Returns comprehensive extraction prompt
  }
}
```

### 9.3 QualityScorerService

```typescript
@Injectable()
export class QualityScorerService {
  async calculateScore(organizationId: string): Promise<QualityScore> {
    const context = await this.prisma.organizationContext.findUnique({
      where: { organizationId }
    });

    const identityScore = this.calculateIdentityScore(context);
    const programsScore = this.calculateProgramsScore(context);
    const capacityScore = this.calculateCapacityScore(context);
    const impactScore = this.calculateImpactScore(context);

    const overallScore = Math.round(
      identityScore * 0.30 +
      programsScore * 0.35 +
      capacityScore * 0.20 +
      impactScore * 0.15
    );

    // Update scores in database
    await this.prisma.organizationContext.update({
      where: { organizationId },
      data: {
        identityScore,
        programsScore,
        capacityScore,
        impactScore,
        overallScore
      }
    });

    return {
      identity: identityScore,
      programs: programsScore,
      capacity: capacityScore,
      impact: impactScore,
      overall: overallScore
    };
  }

  private calculateIdentityScore(context: OrganizationContext): number {
    let score = 0;

    if (context.mission) score += 40;
    if (context.vision) score += 15;
    if (context.focusAreas?.length >= 3) score += 20;
    if (context.geographicScope) score += 10;
    if (context.targetPopulation) score += 15;

    return Math.min(score, 100);
  }

  // ... other scoring methods
}
```

### 9.4 WebsiteScraperService

```typescript
@Injectable()
export class WebsiteScraperService {
  constructor(
    private anthropic: Anthropic,
    private queue: Queue
  ) {}

  async scrapeWebsite(organizationId: string, websiteUrl: string): Promise<string> {
    // Create import job
    const job = await this.prisma.websiteImportJob.create({
      data: {
        organizationId,
        websiteUrl,
        status: 'pending'
      }
    });

    // Queue scraping work
    await this.queue.add('scrape-website', { jobId: job.id });

    return job.id;
  }

  async processScrapeJob(jobId: string): Promise<void> {
    const job = await this.prisma.websiteImportJob.findUnique({
      where: { id: jobId }
    });

    try {
      // Update status
      await this.updateJobStatus(jobId, 'scraping');

      // Launch browser
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      // Scrape key pages
      const pages = await this.discoverPages(job.websiteUrl);
      const scrapedContent = [];

      for (const pageUrl of pages.slice(0, 10)) {
        const content = await this.scrapePage(page, pageUrl);
        scrapedContent.push(content);
      }

      await browser.close();

      // Update status
      await this.updateJobStatus(jobId, 'processing');

      // Extract with AI
      const extracted = await this.extractFromContent(scrapedContent);

      // Save results
      await this.prisma.websiteImportJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          pagesScraped: scrapedContent.length,
          extractedData: extracted,
          completedAt: new Date()
        }
      });

    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', error.message);
    }
  }

  private async scrapePage(page: Page, url: string): Promise<string> {
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Extract main content
    const content = await page.evaluate(() => {
      // Remove scripts, styles, nav, footer
      const elementsToRemove = document.querySelectorAll('script, style, nav, footer, header');
      elementsToRemove.forEach(el => el.remove());

      // Get main content
      const main = document.querySelector('main') || document.querySelector('article') || document.body;
      return main?.innerText || '';
    });

    return content;
  }
}
```

---

## 10. Integration Points

### 10.1 Integration with Existing Features

**Proposal Writing Integration**:
```typescript
// When user starts writing a proposal, context is automatically included

async generateProposalSection(sectionId: string) {
  // Get organization context
  const context = await this.getOrganizationContext(organizationId);

  // Include in prompt
  const systemPrompt = `
    You are writing a grant proposal section.

    Organization Context:
    Mission: ${context.mission}
    Programs: ${JSON.stringify(context.programs)}
    Impact: ${JSON.stringify(context.impactMetrics)}

    Use this context to write compelling, accurate content.
  `;

  // Generate section
  return await this.aiService.generate(systemPrompt, userPrompt);
}
```

**Grant Search Integration**:
```typescript
// Use organization context to improve grant matching

async searchGrants(query: string, organizationId: string) {
  const context = await this.getOrganizationContext(organizationId);

  // Match based on focus areas
  const grants = await this.grantService.search({
    keywords: query,
    categories: context.focusAreas,
    amountRange: this.estimateFundingNeed(context)
  });

  return grants;
}
```

**Document Library Integration**:
```typescript
// Onboarding documents automatically added to library

async completeOnboarding(organizationId: string) {
  // Get all onboarding documents
  const onboardingDocs = await this.prisma.onboardingDocument.findMany({
    where: { organizationId }
  });

  // Add to document library
  for (const doc of onboardingDocs) {
    await this.documentService.create({
      organizationId,
      title: doc.fileName,
      type: doc.documentType,
      content: doc.extractedData,
      uploadedBy: doc.uploadedBy
    });
  }
}
```

### 10.2 RAG Integration

**Context Retrieval for Proposals**:
```typescript
// When AI needs organizational context

async getRelevantContext(organizationId: string, purpose: string) {
  // Semantic search against embedded onboarding documents
  const results = await this.embeddingService.semanticSearch(
    organizationId,
    purpose,
    10 // top 10 chunks
  );

  // Also get structured context
  const structuredContext = await this.prisma.organizationContext.findUnique({
    where: { organizationId }
  });

  return {
    documents: results,
    structured: structuredContext
  };
}
```

---

## 11. Success Criteria

### 11.1 User Success Metrics

**Completion Rate**:
- Target: >80% of users complete onboarding
- Measure: Track step-by-step dropoff

**Time to Complete**:
- Target: <10 minutes median
- Measure: Track duration from start to finish

**Quality Score Achievement**:
- Target: >70% of users reach "Good" (60+) score
- Target: >40% of users reach "Excellent" (80+) score

**Document Upload Rate**:
- Target: >60% of users upload at least 1 document
- Target: >30% of users upload 3+ documents

### 11.2 AI Extraction Metrics

**Extraction Accuracy**:
- Target: >85% confidence on mission statements
- Target: >80% confidence on program descriptions
- Measure: Track confidence scores + user edits

**Processing Time**:
- Target: <30 seconds per document
- Target: <2 minutes for website import

**User Acceptance Rate**:
- Target: >70% of AI extractions accepted without edits
- Measure: Track accept vs edit vs reject actions

### 11.3 Business Impact Metrics

**Proposal Quality Improvement**:
- Measure: Proposal quality scores before/after onboarding
- Target: 25% improvement in AI-generated content quality

**User Retention**:
- Target: Users who complete onboarding have >2x retention
- Measure: 30-day active rate

**Feature Adoption**:
- Target: >50% of onboarded users create first proposal within 7 days
- Measure: Time to first proposal

---

## 12. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Database schema
- Basic onboarding flow (steps 1-2)
- Document upload infrastructure
- Quality score calculation logic

### Phase 2: AI Extraction (Weeks 3-4)
- Document processing service
- Claude integration for extraction
- Confidence scoring
- Embedding creation

### Phase 3: Advanced Features (Weeks 5-6)
- Website scraping
- Multi-document processing
- Deduplication & merging
- Recommendations engine

### Phase 4: Polish & Testing (Week 7)
- Animations and visual polish
- User testing
- Performance optimization
- Bug fixes

### Phase 5: Integration (Week 8)
- Connect to proposal generation
- Grant search integration
- Document library sync
- End-to-end testing

---

## 13. Open Questions & Decisions Needed

**User Research Needed**:
1. Which document types do users have readily available?
2. What's the acceptable onboarding time before abandonment?
3. Do users prefer upload-first or manual-entry-first workflows?

**Design Decisions**:
1. Should onboarding be required or optional?
2. Can users skip steps and come back later?
3. Should we show a preview of AI-generated proposals during onboarding?

**Technical Decisions**:
1. Processing timeout limits for large documents?
2. Storage limits per organization?
3. Rate limiting for website scraping?
4. Caching strategy for AI extractions?

**Business Decisions**:
1. Should quality score be visible to users always?
2. Gamification elements (badges, achievements)?
3. Notifications for incomplete onboarding?

---

## Appendix: User Stories

### User Story 1: New Nonprofit User
**As a** new user from a small nonprofit
**I want** to quickly set up my organization profile
**So that** I can start writing grant proposals immediately

**Acceptance Criteria**:
- Can complete onboarding in under 10 minutes
- Can upload annual report and have mission auto-extracted
- Receives clear feedback on what information is missing
- Can skip sections and return later

### User Story 2: Experienced Grant Writer
**As an** experienced grant writer
**I want** to import all my organization's documents at once
**So that** the AI has comprehensive context for proposals

**Acceptance Criteria**:
- Can upload multiple documents (5+) simultaneously
- Can see what information was extracted from each document
- Can edit auto-extracted information before saving
- Sees how each document improves quality score

### User Story 3: Executive Director
**As an** executive director with limited time
**I want** to use our existing website to populate the profile
**So that** I don't have to manually enter information

**Acceptance Criteria**:
- Can enter website URL and have content auto-imported
- System scrapes relevant pages (about, programs, impact)
- Extracted data is accurate and well-organized
- Can quickly review and approve extracted information

### User Story 4: Development Coordinator
**As a** development coordinator
**I want** to know if we have enough context for quality proposals
**So that** I can decide whether to add more information

**Acceptance Criteria**:
- Clear quality score with visual indicator
- Specific recommendations on what to add
- Can see how each addition improves the score
- Understand what "good enough" looks like

---

**End of Plan**

This comprehensive plan provides a complete blueprint for implementing the intelligent onboarding feature with best-in-class UX and AI-powered automation.
