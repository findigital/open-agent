# Onboarding Feature - Next Implementation Steps

## Architecture Decisions (Based on Existing Codebase)

### ✅ **Use Existing Infrastructure**

1. **AI Extraction**: Use `BaseAgentService` with Claude 3.5 Sonnet
   - Pattern: Follow `BudgetAgentService` agentic loop approach
   - Tool calling for structured data extraction
   - Already have Anthropic SDK configured

2. **Web Scraping**: Use existing `Exa` integration
   - Already installed: `exa-js` npm package
   - Tool exists: `createExaCrawlTool` in copilot/tools
   - Better than Crawl4AI - AI-powered, cleaner output

3. **Document Storage**: Use existing `OrganizationDocument` model
   - Already has: title, type, content, metadata fields
   - Already has: embedding generation pipeline
   - Already has: semantic search with pgvector

4. **API Pattern**: GraphQL with NestJS modules
   - All modules follow: `*.module.ts`, `*.resolver.ts`, `dto/*.ts`
   - Use existing patterns from budget/proposal modules

---

## Phase 1: Backend API Layer (CRITICAL - 2-3 hours)

### Step 1.1: Create Onboarding Module

**File**: `packages/backend/server/src/modules/onboarding/onboarding.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { OrganizationModule } from '../organization/organization.module';
import { OnboardingService } from './onboarding.service';
import { QualityScorerService } from './quality-scorer.service';
import { OnboardingAgentService } from './onboarding-agent.service';
import { OnboardingResolver } from './onboarding.resolver';

@Module({
  imports: [OrganizationModule],
  providers: [
    PrismaService,
    OnboardingService,
    QualityScorerService,
    OnboardingAgentService,
    OnboardingResolver,
  ],
  exports: [OnboardingService, QualityScorerService],
})
export class OnboardingModule {}
```

### Step 1.2: Create DTOs

**Files needed**:
- `dto/start-onboarding.input.ts`
- `dto/basic-info.input.ts`
- `dto/mission.input.ts`
- `dto/needs.input.ts` ⭐ NEW
- `dto/program.input.ts`
- `dto/capacity.input.ts`
- `dto/quality-score.output.ts`
- `dto/onboarding-status.output.ts`

**Example**: `dto/needs.input.ts`
```typescript
import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class NeedsEvidenceInput {
  @Field()
  @IsString()
  statistic: string;

  @Field()
  @IsString()
  source: string;

  @Field({ nullable: true })
  @IsOptional()
  year?: number;
}

@InputType()
export class SaveNeedsInput {
  @Field()
  @IsString()
  organizationId: string;

  @Field()
  @IsString()
  primaryNeed: string;

  @Field(() => [NeedsEvidenceInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NeedsEvidenceInput)
  needEvidence?: NeedsEvidenceInput[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  impactWithoutOrg?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  gapsInSolutions?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  uniqueApproach?: string;
}
```

### Step 1.3: Create GraphQL Resolver

**File**: `packages/backend/server/src/modules/onboarding/onboarding.resolver.ts`

```typescript
import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../base/auth/auth.guard';
import { CurrentUser } from '../../base/auth/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import { QualityScorerService } from './quality-scorer.service';
import { OnboardingAgentService } from './onboarding-agent.service';

@Resolver()
@UseGuards(AuthGuard)
export class OnboardingResolver {
  constructor(
    private onboardingService: OnboardingService,
    private qualityScorer: QualityScorerService,
    private onboardingAgent: OnboardingAgentService
  ) {}

  @Mutation(() => OnboardingProgressOutput)
  async startOnboarding(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string
  ) {
    return this.onboardingService.startOnboarding(user.id, organizationId);
  }

  @Mutation(() => Boolean)
  async saveBasicInfo(
    @CurrentUser() user: { id: string },
    @Args('input') input: BasicInfoInput
  ) {
    await this.onboardingService.saveBasicInfo(input.organizationId, input);
    return true;
  }

  @Mutation(() => Boolean)
  async saveMission(
    @CurrentUser() user: { id: string },
    @Args('input') input: MissionInput
  ) {
    await this.onboardingService.saveMission(input.organizationId, input);
    return true;
  }

  @Mutation(() => Boolean)
  async saveNeeds(
    @CurrentUser() user: { id: string },
    @Args('input') input: SaveNeedsInput
  ) {
    await this.onboardingService.saveNeeds(input.organizationId, input);
    return true;
  }

  @Mutation(() => Boolean)
  async addProgram(
    @CurrentUser() user: { id: string },
    @Args('input') input: ProgramInput
  ) {
    await this.onboardingService.addProgram(input.organizationId, input);
    return true;
  }

  @Query(() => QualityScoreOutput)
  async getQualityScore(
    @Args('organizationId') organizationId: string
  ) {
    return this.qualityScorer.calculateScore(organizationId);
  }

  @Query(() => [RecommendationOutput])
  async getRecommendations(
    @Args('organizationId') organizationId: string
  ) {
    return this.qualityScorer.getRecommendations(organizationId);
  }

  @Mutation(() => ExtractionResultOutput)
  async extractFromDocument(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string,
    @Args('documentContent') documentContent: string
  ) {
    return this.onboardingAgent.extractOrganizationData(organizationId, documentContent);
  }

  @Mutation(() => ExtractionResultOutput)
  async extractFromWebsite(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string,
    @Args('websiteUrl') websiteUrl: string
  ) {
    return this.onboardingAgent.extractFromWebsite(organizationId, websiteUrl);
  }
}
```

---

## Phase 2: AI Extraction Agent (3-4 hours)

### Step 2.1: Create Onboarding Agent Service

**File**: `packages/backend/server/src/modules/onboarding/onboarding-agent.service.ts`

**Pattern**: Follow `BudgetAgentService` agentic loop approach

```typescript
import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { OnboardingService } from './onboarding.service';
import { QualityScorerService } from './quality-scorer.service';
import Exa from 'exa-js';

export interface ExtractedOrganizationData {
  // Identity
  mission?: string;
  vision?: string;
  values?: string[];
  focusAreas?: string[];

  // Needs & Gaps ⭐
  primaryNeed?: string;
  needEvidence?: Array<{ statistic: string; source: string; year?: number }>;
  uniqueApproach?: string;
  gapsInSolutions?: string;
  impactWithoutOrg?: string;

  // Programs
  programs?: Array<{
    name: string;
    description: string;
    needAddressed?: string;
    howAddressesNeed?: string;
    outcomes?: string[];
  }>;

  // Confidence
  confidence: number;
}

@Injectable()
export class OnboardingAgentService {
  private readonly logger = new Logger(OnboardingAgentService.name);
  private readonly anthropic: Anthropic;
  private readonly exa: Exa;
  private readonly defaultModel = 'claude-3-5-sonnet-20241022';

  constructor(
    private onboardingService: OnboardingService,
    private qualityScorer: QualityScorerService
  ) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const exaKey = process.env.EXA_API_KEY;

    this.anthropic = new Anthropic({
      apiKey: anthropicKey || 'placeholder',
    });

    this.exa = new Exa(exaKey || 'placeholder');
  }

  /**
   * Extract organization data from document content using Claude
   */
  async extractOrganizationData(
    organizationId: string,
    documentContent: string
  ): Promise<ExtractedOrganizationData> {
    this.logger.log(`Extracting organization data for ${organizationId}`);

    const systemPrompt = this.buildExtractionPrompt();

    const response = await this.anthropic.messages.create({
      model: this.defaultModel,
      max_tokens: 8000,
      temperature: 0.2, // Lower temperature for more consistent extraction
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please extract organization information from this document:\n\n${documentContent}`,
        },
      ],
    });

    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    // Parse JSON response
    const extracted = JSON.parse(textContent) as ExtractedOrganizationData;

    // Auto-save extracted data
    if (extracted.mission) {
      await this.onboardingService.saveMission(organizationId, {
        mission: extracted.mission,
        vision: extracted.vision,
        values: extracted.values,
        focusAreas: extracted.focusAreas || [],
      });
    }

    if (extracted.primaryNeed) {
      await this.onboardingService.saveNeeds(organizationId, {
        primaryNeed: extracted.primaryNeed,
        needEvidence: extracted.needEvidence,
        uniqueApproach: extracted.uniqueApproach,
        gapsInSolutions: extracted.gapsInSolutions,
        impactWithoutOrg: extracted.impactWithoutOrg,
      });
    }

    // Recalculate quality score
    await this.qualityScorer.calculateScore(organizationId);

    return extracted;
  }

  /**
   * Extract organization data from website using Exa
   */
  async extractFromWebsite(
    organizationId: string,
    websiteUrl: string
  ): Promise<ExtractedOrganizationData> {
    this.logger.log(`Extracting from website: ${websiteUrl}`);

    // Use Exa to crawl the website
    const crawlResult = await this.exa.getContents([websiteUrl], {
      livecrawl: 'always',
      text: {
        maxCharacters: 100000,
      },
    });

    if (crawlResult.results.length === 0) {
      throw new Error('Failed to crawl website');
    }

    const websiteContent = crawlResult.results[0].text;

    // Extract using Claude
    return this.extractOrganizationData(organizationId, websiteContent || '');
  }

  /**
   * Build comprehensive extraction prompt for Claude
   */
  private buildExtractionPrompt(): string {
    return `You are an expert at extracting structured information from nonprofit organization documents.

Your task is to extract the following information from documents (annual reports, strategic plans, websites, etc.):

## Identity
- Mission statement (1-3 sentences)
- Vision statement (1-2 sentences)
- Core values (list)
- Focus areas / issue areas (list)
- Geographic scope
- Target population

## Needs & Gaps ⭐ CRITICAL
- Primary need/problem the organization addresses (2-4 sentences with data if available)
- Supporting evidence (array of {statistic, source, year})
  - Example: {"statistic": "40% of students lack access to after-school programs", "source": "2024 County Assessment", "year": 2024}
- Impact without this organization (what would happen if they didn't exist)
- Gaps in existing solutions (why current programs/services are inadequate)
- Organization's unique approach (how they solve the problem differently)

## Programs
- Array of programs with:
  - Name
  - Description (2-3 sentences)
  - Need addressed (specific problem this program solves)
  - How it addresses the need (what the program does)
  - Target population
  - Outcomes/metrics

## Capacity
- Staff count
- Board size
- Leadership team
- Financial data (revenue, expenses, budget)

## Output Format
Return ONLY valid JSON with this structure:

{
  "mission": "...",
  "vision": "...",
  "values": ["...", "..."],
  "focusAreas": ["...", "..."],
  "geographicScope": "...",
  "targetPopulation": "...",

  "primaryNeed": "Detailed problem statement with data if available...",
  "needEvidence": [
    {"statistic": "...", "source": "...", "year": 2024}
  ],
  "uniqueApproach": "...",
  "gapsInSolutions": "...",
  "impactWithoutOrg": "...",

  "programs": [
    {
      "name": "...",
      "description": "...",
      "needAddressed": "...",
      "howAddressesNeed": "...",
      "targetPopulation": "...",
      "outcomes": ["...", "..."]
    }
  ],

  "staffCount": 15,
  "boardCount": 12,

  "confidence": 0.85
}

## Instructions
- Extract ONLY information explicitly stated in the document
- For missing fields, use null
- Include a confidence score (0-1) for the overall extraction
- For needs/gaps, prioritize extracting:
  1. Quantifiable data (numbers, percentages, statistics)
  2. Sources for evidence
  3. Specific problem statements (not vague descriptions)
- Return valid JSON only - no markdown, no explanations`;
  }
}
```

---

## Phase 3: Frontend Wizard (4-6 hours)

### Architecture
```
packages/frontend/app/src/pages/onboarding-wizard/
├── OrganizationOnboarding.tsx          # Main container
├── hooks/
│   └── useOnboardingWizard.ts          # State management
├── components/
│   ├── steps/
│   │   ├── WelcomeStep.tsx
│   │   ├── BasicInfoStep.tsx
│   │   ├── MissionNeedsStep.tsx        ⭐ Combined mission + needs
│   │   ├── ProgramsStep.tsx
│   │   ├── CapacityStep.tsx
│   │   ├── ReviewStep.tsx
│   │   └── SuccessStep.tsx
│   ├── QualityMeter.tsx                # 5-category visual meter
│   ├── DocumentUpload.tsx              # Drag-drop + AI extraction
│   ├── WebsiteImport.tsx               # URL input + Exa scraping
│   ├── ProgressStepper.tsx             # 1/6 indicator
│   └── ExtractedDataPreview.tsx        # Show AI results
└── graphql/
    └── onboarding.graphql              # GraphQL queries/mutations
```

### Key Components

**1. QualityMeter.tsx** - Visual indicator
```tsx
interface QualityMeterProps {
  score: number;
  breakdown: {
    identity: number;
    needs: number;      // ⭐ NEW
    programs: number;
    capacity: number;
    impact: number;
  };
}

// Shows 5 category bars + overall score
// Color-coded: 0-60 orange, 61-80 yellow, 81-100 green
```

**2. MissionNeedsStep.tsx** - Combined Step 2
```tsx
// Two-tab interface:
// Tab 1: Mission, Vision, Values, Focus Areas
// Tab 2: Community Needs & Gaps ⭐
//   - Primary need statement (textarea, 800 chars)
//   - Evidence builder (+ Add Evidence button)
//   - Unique approach
//   - Gap analysis
//   - Impact without org
```

**3. DocumentUpload.tsx** - AI-powered upload
```tsx
// Drag-drop area
// Upload → Shows processing animation
// Calls extractFromDocument mutation
// Displays ExtractedDataPreview
// User can Accept or Edit
```

---

## Phase 4: Integration (2-3 hours)

### Connect to Proposal Generation

**File**: `packages/backend/server/src/modules/proposal/proposal-agent.service.ts`

**Update system prompts to include organization context**:

```typescript
private async buildProposalPrompt(proposalId: string) {
  // Get organization context
  const proposal = await this.prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { organization: { include: { context: true } } }
  });

  const context = proposal.organization.context;

  let prompt = `You are writing a grant proposal.

## Organization Context
Mission: ${context?.mission}
Vision: ${context?.vision}

## Community Need (CRITICAL FOR NEED STATEMENT SECTION) ⭐
Primary Need: ${context?.primaryNeed}
Supporting Evidence: ${JSON.stringify(context?.needEvidence)}
Impact Without Organization: ${context?.impactWithoutOrg}
Gaps in Existing Solutions: ${context?.gapsInSolutions}
Our Unique Approach: ${context?.uniqueApproach}

## Programs
${JSON.stringify(context?.programs)}

## Instructions
- Use the organization context to write compelling, accurate proposals
- Ground all need statements in the provided evidence and data
- Connect programs to the specific needs they address
- Use quantifiable data wherever possible
`;

  return prompt;
}
```

---

## Testing Strategy

### Backend Tests
1. Unit tests for `QualityScorerService.calculateNeedsScore()`
2. Integration test for `OnboardingAgentService.extractOrganizationData()`
3. E2E test for complete onboarding flow

### Frontend Tests
1. Component tests for QualityMeter
2. Integration test for wizard navigation
3. E2E test: Upload doc → Extract → Save → View quality score

---

## Deployment Checklist

- [ ] Run database migration: `npx prisma migrate dev --name add-needs-to-onboarding`
- [ ] Set environment variables: `ANTHROPIC_API_KEY`, `EXA_API_KEY`
- [ ] Register `OnboardingModule` in `app.module.ts`
- [ ] Generate GraphQL schema: `npm run graphql:generate`
- [ ] Test extraction with sample annual report
- [ ] Test website import with sample nonprofit URL
- [ ] Verify quality scoring with needs data
- [ ] Test proposal generation with organization context

---

## Success Metrics

### Technical
- [ ] Quality score calculation includes needs (25% weight)
- [ ] Document extraction accuracy >80% confidence
- [ ] Website import completes in <30 seconds
- [ ] All 6 wizard steps functional

### User Experience
- [ ] User can complete onboarding in <10 minutes
- [ ] AI extraction reduces manual entry by >60%
- [ ] Quality meter provides clear recommendations
- [ ] Extracted data is editable before saving

---

## Next Immediate Action

**Start with Step 1.1**: Create `onboarding.module.ts` and register it in `app.module.ts`

This will:
1. Wire up existing services (OnboardingService, QualityScorerService)
2. Make them accessible via GraphQL
3. Enable frontend development

Would you like me to begin implementation?
