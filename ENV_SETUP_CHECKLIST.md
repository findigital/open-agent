# Environment Setup Checklist

## Overview

This checklist ensures all required environment variables are configured correctly for the grant writing system with AI agents and grant-specific tools.

## Required Environment Variables

### 1. Database Configuration

```env
DATABASE_URL="postgresql://user:password@localhost:5432/openagent?schema=public"
```

**Purpose:** PostgreSQL database connection
**Required:** ✅ Yes
**Used By:** All database operations, Prisma ORM

**Verification:**
```bash
# Test database connection
npx prisma db execute --stdin <<< "SELECT 1;"
```

---

### 2. Copilot System

```env
COPILOT_ENABLED=true
```

**Purpose:** Enable multi-provider AI copilot system
**Required:** ✅ Yes (for grant tools to work)
**Used By:** Copilot module, grant agent tools

**Impact if Missing:**
- Grant tools won't be available
- AI agents will still work but without specialized tools

---

### 3. Anthropic API (Primary AI Provider)

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Purpose:** Claude AI model access for grant writing agents
**Required:** ✅ Yes (for AI agents)
**Used By:**
- Research Agent
- Context Agent
- Planning Agent
- Writing Agent
- Compliance Agent
- Editing Agent

**How to Get:**
1. Visit https://console.anthropic.com/
2. Create account or sign in
3. Navigate to API Keys
4. Create new key
5. Copy to `.env` file

**Verification:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

---

### 4. Exa API (Search & Research)

```env
EXA_API_KEY=your_exa_api_key_here
```

**Purpose:** Intelligent web search for grant research
**Required:** ⚠️ Recommended (optional but highly valuable)
**Used By:**
- grants_gov_search tool
- funder_research tool
- research_citations tool

**Impact if Missing:**
- 3 research tools unavailable
- Agents can't search grants.gov
- Can't research funder priorities
- Can't find academic citations

**How to Get:**
1. Visit https://exa.ai/
2. Sign up for account
3. Navigate to API section
4. Generate API key
5. Copy to `.env` file

**Verification:**
```bash
curl -X POST https://api.exa.ai/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: $EXA_API_KEY" \
  -d '{"query": "grants for education", "numResults": 1}'
```

---

### 5. E2B Code Interpreter (File Generation)

```env
E2B_API_KEY=your_e2b_api_key_here
```

**Purpose:** Serverless code execution for Excel/chart generation
**Required:** ❌ Optional (nice-to-have)
**Used By:**
- Budget calculator tool (copilot mode - Excel export)
- Timeline generator tool (copilot mode - Gantt charts)

**Impact if Missing:**
- Budget calculator returns JSON data instead of Excel file
- Timeline generator returns text instead of Gantt chart
- **Agents still work** - they use simplified versions

**How to Get:**
1. Visit https://e2b.dev/
2. Sign up for account
3. Create API key
4. Copy to `.env` file

**Note:** Not critical since agents use simplified versions without file generation.

---

## Tool Availability Matrix

| Tool | No API Keys | +Anthropic | +Exa | +E2B |
|------|-------------|------------|------|------|
| **AI Agents** | ❌ | ✅ | ✅ | ✅ |
| grants_gov_search | ❌ | ❌ | ✅ | ✅ |
| funder_research | ❌ | ❌ | ✅ | ✅ |
| research_citations | ❌ | ❌ | ✅ | ✅ |
| grant_eligibility_check | ✅ | ✅ | ✅ | ✅ |
| budget_validator | ✅ | ✅ | ✅ | ✅ |
| impact_metrics_calculator | ✅ | ✅ | ✅ | ✅ |
| budget_calculator | ✅ (basic) | ✅ (basic) | ✅ (basic) | ✅ (Excel) |
| timeline_generator | ✅ (text) | ✅ (text) | ✅ (text) | ✅ (Gantt) |

**Legend:**
- ✅ = Fully available
- ✅ (basic/text) = Simplified version
- ❌ = Not available

---

## Configuration Levels

### Level 1: Basic Grant Management (No AI)
```env
DATABASE_URL="postgresql://..."
```
**Capabilities:**
- Create proposals manually
- Manage grants and templates
- Track deadlines
- Basic collaboration

**Missing:**
- AI-generated content
- Research tools
- Automated suggestions

---

### Level 2: AI Agents Only
```env
DATABASE_URL="postgresql://..."
COPILOT_ENABLED=true
ANTHROPIC_API_KEY="sk-ant-..."
```

**Capabilities:**
- All 6 AI agents working
- AI-generated proposals
- Basic tool support (5 tools):
  - grant_eligibility_check
  - budget_validator
  - impact_metrics_calculator
  - budget_calculator (simplified)
  - timeline_generator (simplified)

**Missing:**
- Grants.gov search
- Funder research
- Academic citations
- Excel/chart exports

---

### Level 3: Full Research Capabilities (Recommended)
```env
DATABASE_URL="postgresql://..."
COPILOT_ENABLED=true
ANTHROPIC_API_KEY="sk-ant-..."
EXA_API_KEY="..."
```

**Capabilities:**
- All 6 AI agents
- 8 grant tools available
- Grants.gov federal grant search
- Funder background research
- Academic research citations
- Professional budget calculations
- Project timelines

**Missing:**
- Excel budget exports
- Gantt chart visualizations

---

### Level 4: Complete System (Maximum)
```env
DATABASE_URL="postgresql://..."
COPILOT_ENABLED=true
ANTHROPIC_API_KEY="sk-ant-..."
EXA_API_KEY="..."
E2B_API_KEY="..."
```

**Capabilities:**
- Everything from Level 3
- Excel budget spreadsheets
- Gantt chart timelines
- Full file generation support

---

## Environment File Templates

### Development (.env)
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/openagent_dev?schema=public"

# AI Services
COPILOT_ENABLED=true
ANTHROPIC_API_KEY="sk-ant-api03-your-dev-key-here"
EXA_API_KEY="your-exa-dev-key-here"

# Optional
E2B_API_KEY="your-e2b-dev-key-here"

# Server
NODE_ENV=development
PORT=3000
```

### Production (.env.production)
```env
# Database
DATABASE_URL="postgresql://user:secure_password@prod-db:5432/openagent?schema=public&sslmode=require"

# AI Services
COPILOT_ENABLED=true
ANTHROPIC_API_KEY="sk-ant-api03-your-prod-key-here"
EXA_API_KEY="your-exa-prod-key-here"
E2B_API_KEY="your-e2b-prod-key-here"

# Server
NODE_ENV=production
PORT=8080

# Security
CORS_ORIGIN="https://yourdomain.com"
SESSION_SECRET="your-secure-session-secret"
```

### Testing (.env.test)
```env
# Test Database (separate from development)
DATABASE_URL="postgresql://postgres:password@localhost:5432/openagent_test?schema=public"

# Mock AI (or use real API keys with low rate limits)
COPILOT_ENABLED=false

# Server
NODE_ENV=test
```

---

## Verification Script

Create `scripts/verify-env.ts`:

```typescript
import { config } from 'dotenv';
config();

const checks = {
  'Database': !!process.env.DATABASE_URL,
  'Copilot Enabled': process.env.COPILOT_ENABLED === 'true',
  'Anthropic API': !!process.env.ANTHROPIC_API_KEY,
  'Exa API (optional)': !!process.env.EXA_API_KEY,
  'E2B API (optional)': !!process.env.E2B_API_KEY,
};

console.log('\n🔍 Environment Configuration Check\n');
console.log('=====================================\n');

Object.entries(checks).forEach(([name, status]) => {
  const icon = status ? '✅' : '❌';
  const label = name.includes('optional') ? `${name}` : name;
  console.log(`${icon} ${label}`);
});

console.log('\n=====================================\n');

const requiredKeys = ['Database', 'Copilot Enabled', 'Anthropic API'];
const allRequiredPresent = requiredKeys.every(key => checks[key]);

if (allRequiredPresent) {
  console.log('✅ All required environment variables configured!\n');
  console.log('🎯 Configuration Level:');
  if (checks['E2B API (optional)']) {
    console.log('   Level 4: Complete System (Maximum)\n');
  } else if (checks['Exa API (optional)']) {
    console.log('   Level 3: Full Research Capabilities (Recommended)\n');
  } else {
    console.log('   Level 2: AI Agents Only\n');
  }
  process.exit(0);
} else {
  console.log('❌ Missing required environment variables!\n');
  console.log('Required:');
  console.log('- DATABASE_URL');
  console.log('- COPILOT_ENABLED=true');
  console.log('- ANTHROPIC_API_KEY\n');
  process.exit(1);
}
```

Run with:
```bash
npx tsx scripts/verify-env.ts
```

---

## Security Best Practices

### ⚠️ Never Commit API Keys
Add to `.gitignore`:
```
.env
.env.*
!.env.example
```

### ✅ Use Environment Variables Manager
Consider tools like:
- **Doppler** - Secrets management
- **AWS Secrets Manager** - For AWS deployments
- **Vault by HashiCorp** - Self-hosted secrets

### ✅ Rotate Keys Regularly
- Rotate production keys every 90 days
- Immediately rotate if compromised
- Use different keys for dev/staging/prod

### ✅ Limit Key Permissions
- Use API keys with minimal required permissions
- Set rate limits
- Monitor usage for anomalies

---

## Troubleshooting

### Issue: "Anthropic API key is invalid"

**Solution:**
1. Verify key starts with `sk-ant-api03-`
2. Check for extra spaces or newlines
3. Regenerate key in Anthropic Console
4. Ensure key has not expired

### Issue: "Exa API not responding"

**Solution:**
1. Check API key is correct
2. Verify Exa service status
3. Check rate limits haven't been exceeded
4. Test with curl command above

### Issue: "Database connection failed"

**Solution:**
1. Verify PostgreSQL is running
2. Check username/password correct
3. Ensure database exists
4. Verify network connectivity
5. Check SSL/TLS settings match requirement

### Issue: "Grant tools not appearing for agents"

**Solution:**
1. Check `COPILOT_ENABLED=true`
2. Verify `EXA_API_KEY` set (for search tools)
3. Restart server after changing `.env`
4. Check logs for tool initialization errors

---

## Cost Estimation

### Anthropic API (Claude)
- **Model:** claude-3-5-sonnet-20241022
- **Cost:** ~$3 per 1M input tokens, ~$15 per 1M output tokens
- **Per Proposal:** ~$0.50 - $2.00 (typical 6-agent workflow)
- **Monthly (100 proposals):** ~$50 - $200

### Exa API
- **Cost:** Varies by plan (check exa.ai/pricing)
- **Free Tier:** Usually includes some searches
- **Per Search:** $0.01 - $0.05 depending on plan
- **Monthly (300 searches):** ~$3 - $15

### E2B API
- **Cost:** Based on execution time
- **Free Tier:** Usually includes some executions
- **Per Document:** ~$0.01 - $0.05
- **Monthly (50 exports):** ~$0.50 - $2.50

**Total Monthly Cost (estimated):**
- Light usage (20 proposals): ~$20 - $50
- Medium usage (100 proposals): ~$60 - $220
- Heavy usage (500 proposals): ~$300 - $1,000

---

## Next Steps

1. ✅ Copy `.env.example` to `.env`
2. ✅ Set `DATABASE_URL`
3. ✅ Set `COPILOT_ENABLED=true`
4. ✅ Get and set `ANTHROPIC_API_KEY`
5. ⚠️ Optional: Get and set `EXA_API_KEY` (recommended)
6. ⚠️ Optional: Get and set `E2B_API_KEY`
7. ✅ Run verification script
8. ✅ Test with sample proposal

---

## Support

If you encounter environment configuration issues:

1. Run the verification script first
2. Check the troubleshooting section
3. Review application logs
4. Test API keys independently with curl
5. Consult service status pages (Anthropic, Exa, E2B)
