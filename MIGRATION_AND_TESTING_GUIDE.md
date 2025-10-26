# Migration and Testing Guide

## Overview

This guide provides step-by-step instructions for applying the database migration and testing the grant writing system.

## Phase 1: Database Migration

### Prerequisites

1. PostgreSQL database running and accessible
2. `DATABASE_URL` environment variable configured
3. Prisma CLI installed (`npm install -g prisma` or use `npx`)

### Migration Files

The migration adds character limit fields to support strict grant requirements:

**Location:** `packages/backend/server/prisma/migrations/add_character_limits_and_scoring/migration.sql`

**Changes:**
- Adds `character_limit` (INTEGER) to `proposal_sections`
- Adds `character_limit_no_spaces` (INTEGER) to `proposal_sections`
- Adds `character_limit` (INTEGER) to `template_sections`
- Adds `character_limit_no_spaces` (INTEGER) to `template_sections`
- Adds comments to `metadata` columns explaining scoring rubric storage

### Step 1: Rename Migration Directory

The migration directory needs a timestamp prefix for Prisma to recognize it:

```bash
cd packages/backend/server/prisma/migrations

# Get current timestamp in Prisma format
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Rename directory
mv add_character_limits_and_scoring "${TIMESTAMP}_add_character_limits_and_scoring"
```

### Step 2: Apply Migration

```bash
cd packages/backend/server

# Method 1: Development (recommended for local)
npx prisma migrate dev

# Method 2: Production (for deployed environments)
npx prisma migrate deploy
```

### Step 3: Generate Prisma Client

After migration, regenerate the Prisma client:

```bash
npx prisma generate
```

### Step 4: Verify Migration

Check that columns were added:

```sql
-- Connect to your database and run:
\d proposal_sections;
\d template_sections;

-- You should see:
-- character_limit | integer |
-- character_limit_no_spaces | integer |
```

Or programmatically:

```bash
npx prisma studio
# Navigate to proposal_sections or template_sections
# Verify new columns appear
```

### Rollback (If Needed)

If something goes wrong:

```bash
# Rollback last migration
npx prisma migrate reset
```

⚠️ **Warning:** This will reset the entire database! Use with caution.

For targeted rollback, manually run:

```sql
ALTER TABLE "proposal_sections"
  DROP COLUMN IF EXISTS "character_limit",
  DROP COLUMN IF EXISTS "character_limit_no_spaces";

ALTER TABLE "template_sections"
  DROP COLUMN IF EXISTS "character_limit",
  DROP COLUMN IF EXISTS "character_limit_no_spaces";
```

---

## Phase 2: Environment Configuration

### Required Environment Variables

Create or update `.env` file in `packages/backend/server/`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/openagent?schema=public"

# Copilot (required for grant tools)
COPILOT_ENABLED=true

# Exa API (required for grants.gov search, funder research, citations)
EXA_API_KEY=your_exa_api_key_here

# E2B (optional - for budget/timeline file generation in copilot mode)
E2B_API_KEY=your_e2b_api_key_here

# Anthropic (for AI agents)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Tool Availability by API Key

| Tool | Requires | Falls Back |
|------|----------|------------|
| grants_gov_search | EXA_API_KEY | Tool unavailable |
| funder_research | EXA_API_KEY | Tool unavailable |
| research_citations | EXA_API_KEY | Tool unavailable |
| grant_eligibility_check | None | Always available |
| budget_validator | None | Always available |
| impact_metrics_calculator | None | Always available |
| budget_calculator | None | Simplified (no Excel) |
| timeline_generator | None | Simplified (text only) |

### Verify Configuration

```bash
cd packages/backend/server

# Check environment variables
node -e "require('dotenv').config(); console.log({
  database: !!process.env.DATABASE_URL,
  copilot: !!process.env.COPILOT_ENABLED,
  exa: !!process.env.EXA_API_KEY,
  anthropic: !!process.env.ANTHROPIC_API_KEY
})"
```

---

## Phase 3: Unit Testing

### Test Structure

Tests are located in:
- `packages/backend/server/src/__tests__/`

### Run All Tests

```bash
cd packages/backend/server

# Run all tests
npm test

# Run specific test suite
npm test -- zod-to-json-schema.spec.ts

# Run with coverage
npm run test:coverage
```

### Critical Test Suites to Create

#### 1. Zod-to-JSON Schema Converter Tests

**File:** `src/__tests__/zod-to-json-schema.spec.ts`

Test coverage:
- ✓ Converts ZodObject to JSON Schema
- ✓ Handles required vs optional fields
- ✓ Converts ZodString, ZodNumber, ZodBoolean
- ✓ Converts ZodArray with item schemas
- ✓ Handles ZodEnum
- ✓ Processes descriptions
- ✓ Handles nested objects
- ✓ Converts ZodDefault with default values
- ✓ Handles ZodUnion (anyOf)

#### 2. Grant Agent Tools Tests

**File:** `src/__tests__/grant-agent-tools.spec.ts`

Test coverage:
- ✓ createGrantAgentTools returns array of tools
- ✓ Each tool has correct structure (name, description, inputSchema, handler)
- ✓ Tools are filtered by API key availability
- ✓ Budget calculator returns structured data
- ✓ Timeline generator returns text timeline
- ✓ Handlers execute without errors (mocked)

#### 3. Integration Tests

**File:** `src/__tests__/proposal-ai-integration.spec.ts`

Test coverage:
- ✓ AI agents have access to grant tools
- ✓ Tools are correctly combined (base + grant)
- ✓ Agent can execute tool and receive result
- ✓ Character limit enforcement in workflow
- ✓ Scoring rubric prioritization in workflow

---

## Phase 4: Manual Testing

### Test Scenario 1: Create Proposal with Character Limits

1. Create a new proposal
2. Add a section with character limits:
   ```json
   {
     "title": "Project Narrative",
     "type": "narrative",
     "wordLimit": null,
     "characterLimit": 5000,
     "characterLimitNoSpaces": 4500
   }
   ```
3. Generate content with AI
4. Verify:
   - ✓ Agent respects character limits
   - ✓ Content fits within constraints
   - ✓ Character count shown in response

### Test Scenario 2: Use Scoring Rubric

1. Create template section with scoring:
   ```json
   {
     "title": "Methods",
     "metadata": {
       "scoring": {
         "maxPoints": 35,
         "percentage": 35,
         "description": "Quality of proposed methods",
         "reviewerLookFor": [
           "Evidence-based approaches",
           "Clear implementation timeline",
           "Measurable outcomes"
         ]
       }
     }
   }
   ```
2. Generate content with AI
3. Verify:
   - ✓ Agent prioritizes this high-value section
   - ✓ Content addresses "reviewerLookFor" items
   - ✓ More detailed than lower-scoring sections

### Test Scenario 3: Grant Tool Usage

1. Create proposal linked to a grant
2. Trigger AI generation
3. Monitor logs for tool calls:
   ```
   [Research Agent] Using tool: grants_gov_search
   [Research Agent] Using tool: funder_research
   [Planning Agent] Using tool: timeline_generator
   [Writing Agent] Using tool: research_citations
   ```
4. Verify:
   - ✓ Agents successfully call tools
   - ✓ Tool results appear in generated content
   - ✓ No tool execution errors

### Test Scenario 4: End-to-End Workflow

1. **Setup:**
   - Create organization with documents
   - Create grant opportunity
   - Create proposal template with character limits and scoring

2. **Execute:**
   - Create new proposal from template
   - Link to grant opportunity
   - Trigger AI generation for all sections

3. **Verify:**
   - ✓ All 6 agents execute successfully
   - ✓ Research Agent gathers grant info
   - ✓ Context Agent extracts org voice
   - ✓ Planning Agent creates strategic outline
   - ✓ Writing Agent produces quality content
   - ✓ Compliance Agent verifies requirements
   - ✓ Editing Agent polishes final version
   - ✓ Character limits respected
   - ✓ Content prioritized by scoring
   - ✓ Tools used appropriately

---

## Phase 5: Verification Checklist

### Database Migration
- [ ] Migration file has timestamp prefix
- [ ] Migration applied successfully (`npx prisma migrate status`)
- [ ] Prisma client regenerated
- [ ] Columns exist in database (`\d proposal_sections`)
- [ ] No migration errors in logs

### Environment Configuration
- [ ] DATABASE_URL configured
- [ ] COPILOT_ENABLED=true
- [ ] ANTHROPIC_API_KEY configured
- [ ] EXA_API_KEY configured (optional but recommended)
- [ ] Environment variables load correctly

### Code Integration
- [ ] grant-agent-tools.ts compiles without errors
- [ ] zod-to-json-schema.ts compiles without errors
- [ ] proposal-ai.service.ts imports resolve correctly
- [ ] No TypeScript errors in modified files

### Testing
- [ ] Unit tests written for Zod converter
- [ ] Unit tests written for grant agent tools
- [ ] Integration tests written for AI workflow
- [ ] All tests pass
- [ ] Test coverage >80%

### Manual Verification
- [ ] Can create proposal with character limits
- [ ] Can add scoring rubric to template
- [ ] AI agents respect character limits
- [ ] AI agents prioritize by scoring
- [ ] Grants.gov search works (if EXA_API_KEY set)
- [ ] Funder research works (if EXA_API_KEY set)
- [ ] Research citations work (if EXA_API_KEY set)
- [ ] Budget calculator returns data
- [ ] Timeline generator returns timeline

---

## Troubleshooting

### Issue: Prisma can't download binaries

**Error:** `Failed to fetch the engine file at https://binaries.prisma.sh/ - 403 Forbidden`

**Solution:**
```bash
export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
npx prisma generate
```

### Issue: Migration already applied

**Error:** `Migration has already been applied`

**Solution:** This is fine! It means the database is up-to-date. Verify columns exist:
```bash
npx prisma studio
```

### Issue: Tool not available to agents

**Error:** Agent references tool but can't call it

**Solution:**
1. Check tool name matches exactly (e.g., `grants_gov_search` not `grantsGovSearch`)
2. Verify tool is in `createGrantAgentTools()` return array
3. Check tools are combined in `proposal-ai.service.ts`
4. Verify required API keys are set

### Issue: Character limits not enforced

**Cause:** Migration not applied or Prisma client not regenerated

**Solution:**
```bash
npx prisma migrate dev
npx prisma generate
npm run build  # Rebuild backend
```

### Issue: Scoring not prioritizing sections

**Cause:** Metadata not set in template sections

**Solution:** Set metadata.scoring for template sections:
```typescript
await prisma.templateSection.update({
  where: { id: sectionId },
  data: {
    metadata: {
      scoring: {
        maxPoints: 35,
        percentage: 35,
        description: "Methods section",
        reviewerLookFor: ["Evidence-based", "Timeline", "Outcomes"]
      }
    }
  }
});
```

---

## Performance Benchmarks

Expected performance after optimization:

| Operation | Time | Notes |
|-----------|------|-------|
| Migration | <5s | One-time |
| Prisma Generate | 10-20s | After migration |
| Tool Initialization | <100ms | Per agent execution |
| grants_gov_search | 2-5s | Exa API call |
| funder_research | 3-7s | Multiple Exa calls |
| research_citations | 2-5s | Exa API call |
| budget_calculator | <50ms | Pure calculation |
| timeline_generator | <50ms | Text generation |
| Full agent workflow | 30-90s | 6 agents, multiple tool calls |

---

## Next Steps After Verification

Once all checklist items are complete:

1. **Frontend Integration** - Build UI for character limits and scoring rubrics
2. **User Documentation** - Create user guide for new features
3. **Production Deployment** - Deploy to staging environment
4. **User Testing** - Get feedback from grant writers
5. **Monitoring** - Track tool usage and performance
6. **Optimization** - Improve based on real usage data

---

## Support

If you encounter issues:

1. Check logs: `tail -f packages/backend/server/logs/app.log`
2. Verify environment: `node -e "require('dotenv').config(); console.log(process.env)"`
3. Test database: `npx prisma studio`
4. Run diagnostics: `npm run test:copilot`

For persistent issues, review:
- GRANT_TOOLS_INTEGRATION.md
- packages/backend/server/src/modules/ai/README.md (if exists)
- Git commit history for recent changes
