# 🚀 Quick Start Guide - Proposal Writing SaaS

Get up and running in **10 minutes** and start generating AI-powered proposals!

---

## ✅ Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed
- Yarn package manager
- Git

---

## 📦 Step 1: Clone and Setup (2 minutes)

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd open-agent

# Checkout the proposal SaaS branch
git checkout claude/build-proposal-saas-011CUMLpPMxmV1vtEg2pA8jt

# Install dependencies
yarn install
```

---

## 🗄️ Step 2: Configure Database (3 minutes)

### Create PostgreSQL Database

```bash
# Create database
createdb openagent

# Or using psql
psql postgres
CREATE DATABASE openagent;
```

### Enable pgvector Extension

```sql
# Connect to database
psql openagent

# Enable vector extension (required for RAG)
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx
# Should show "vector" in the list
```

### Configure Environment Variables

Create or update `.env` file in `packages/backend/server/`:

```bash
# Required - Database
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/openagent"

# Required - AI Features
ANTHROPIC_API_KEY="sk-ant-your-key-here"

# Optional - Production Embeddings (for RAG)
OPENAI_API_KEY="sk-your-openai-key"

# Optional - External Grant APIs
GRANTS_GOV_API_KEY="your-grants-gov-key"
FOUNDATION_DIRECTORY_API_KEY="your-foundation-key"

# Optional - Server Config
OPEN_AGENT_SERVER_EXTERNAL_URL="http://localhost:8080"
NODE_ENV="development"
```

**Get API Keys**:
- **Anthropic**: https://console.anthropic.com/ (Required for AI)
- **OpenAI**: https://platform.openai.com/ (Optional, for production RAG)
- **Grants.gov**: https://www.grants.gov/ (Optional, for real grant data)

---

## 🔧 Step 3: Run Migrations (1 minute)

```bash
cd packages/backend/server

# Generate Prisma client
yarn prisma generate

# Run migrations
yarn prisma migrate dev --name add_proposal_saas_models

# Seed test data
yarn prisma db seed
```

**What the seed creates**:
- 4 users (admin, manager, writer, viewer)
- 2 organizations (Green Future Foundation, Health Alliance)
- 4 workspaces
- 9 documents (mission, reports, stories)
- 4 templates (Federal, Foundation, Corporate)
- 3 grants ($25K-$500K range)
- 2 complete proposals
- Approvals and comments

---

## 🎬 Step 4: Start the Server (1 minute)

```bash
# From project root
yarn dev

# Server starts on http://localhost:8080
```

**You should see**:
```
✓ Server started successfully
✓ GraphQL Playground: http://localhost:8080/graphql
✓ Modules loaded: 9 proposal SaaS modules
```

---

## 🧪 Step 5: Test the API (3 minutes)

### Open GraphQL Playground

Navigate to: **http://localhost:8080/graphql**

### Login (Get Auth Token)

```graphql
mutation Login {
  # Use your existing auth mutation
  # Or use the test user credentials directly
}
```

**Test Credentials**:
- Email: `admin@nonprofit.org`
- Password: `password123`

### Test Basic Query

```graphql
query TestSetup {
  myOrganizations {
    id
    name
    slug
    workspaces {
      id
      name
      proposals {
        id
        title
        status
      }
    }
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "myOrganizations": [
      {
        "id": "...",
        "name": "Green Future Foundation",
        "slug": "green-future",
        "workspaces": [
          {
            "id": "...",
            "name": "Grant Applications 2025",
            "proposals": [
              {
                "id": "...",
                "title": "Environmental Education and Outreach - Application",
                "status": "draft"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Test AI Generation (The Fun Part!)

```graphql
mutation TestAI {
  generateProposalSection(input: {
    proposalId: "your-proposal-id-from-above"
    sectionId: "your-section-id"
    userGuidance: "Focus on measurable impact and community engagement"
  }) {
    sectionId
    content
    wordCount
    confidence
    suggestions
  }
}
```

**What Happens**:
1. Research Agent analyzes the grant
2. Context Agent retrieves org documents
3. Planning Agent creates outline
4. Writing Agent generates content
5. Editing Agent polishes result
6. Content saved automatically

---

## 🎯 Common Workflows

### Workflow 1: Create New Proposal

```graphql
# 1. List available templates
query {
  proposalTemplates(workspaceId: "your-workspace-id") {
    id
    name
    sections { title }
  }
}

# 2. Find a grant
query {
  searchGrants(input: {
    keywords: ["education"]
    openOnly: true
  }) {
    id
    title
    funderName
    maxAmount
  }
}

# 3. Create proposal
mutation {
  createProposal(input: {
    workspaceId: "your-workspace-id"
    templateId: "template-id"
    grantId: "grant-id"
    title: "My New Grant Proposal"
    requestedAmount: 150000
  }) {
    id
    sections { id, title }
  }
}

# 4. Generate sections with AI
mutation {
  generateProposalSection(input: {
    proposalId: "new-proposal-id"
    sectionId: "section-id"
  }) {
    content
  }
}
```

### Workflow 2: Review and Approve

```graphql
# 1. Get proposal with all details
query {
  proposal(id: "proposal-id") {
    title
    sections { title, content, wordCount }
    comments { content, user { name } }
    approvals { status, approver { name } }
  }
}

# 2. Add comment
mutation {
  createProposalComment(input: {
    proposalId: "proposal-id"
    sectionId: "section-id"
    content: "Great work! Consider adding more metrics."
  }) {
    id
  }
}

# 3. Approve
mutation {
  updateProposalApproval(id: "approval-id", input: {
    status: approved
    comment: "Ready for submission!"
  }) {
    id
  }
}
```

### Workflow 3: Check Compliance

```graphql
mutation {
  checkProposalCompliance(
    proposalId: "proposal-id"
    grantId: "grant-id"
  ) {
    compliant
    score
    issues {
      severity
      section
      issue
      suggestion
    }
    recommendations
  }
}
```

---

## 📚 Documentation

- **GRAPHQL_EXAMPLES.md** - Complete API reference with 60+ examples
- **FINAL_BUILD_SUMMARY.md** - Complete feature overview
- **BUILD_SESSION_SUMMARY.md** - Detailed module breakdown
- **CONTINUE_IN_IDE.md** - Development guide

---

## 🔧 Development Commands

```bash
# Database
yarn prisma migrate dev        # Run migrations
yarn prisma db seed            # Seed test data
yarn prisma studio             # Browse database GUI
yarn prisma migrate reset      # Reset database (WARNING: deletes all data)

# Development
yarn dev                       # Start dev server
yarn build                     # Build for production
yarn test                      # Run tests

# Utilities
yarn ts-node scripts/generate-embeddings.ts --all    # Generate embeddings
```

---

## 🐛 Troubleshooting

### Database Connection Error

```
Error: Can't reach database server
```

**Fix**:
1. Ensure PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL in .env
3. Test connection: `psql openagent`

### pgvector Extension Error

```
Error: extension "vector" does not exist
```

**Fix**:
```bash
# Install pgvector (Ubuntu/Debian)
sudo apt install postgresql-14-pgvector

# Install pgvector (macOS)
brew install pgvector

# Enable in database
psql openagent -c "CREATE EXTENSION vector;"
```

### AI Generation Fails

```
Error: ANTHROPIC_API_KEY not configured
```

**Fix**:
1. Get API key from https://console.anthropic.com/
2. Add to .env: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart server

### Migration Fails

```
Error: Migration failed
```

**Fix**:
```bash
# Reset and retry
yarn prisma migrate reset
yarn prisma migrate dev
yarn prisma db seed
```

---

## 🎓 Learning Path

### Beginner (30 minutes)

1. ✅ Complete quick start
2. ✅ Browse seed data in GraphQL Playground
3. ✅ Create a new proposal manually
4. ✅ Add comments and approvals

### Intermediate (2 hours)

1. ✅ Generate proposal sections with AI
2. ✅ Check compliance
3. ✅ Upload organization documents
4. ✅ Search for grants
5. ✅ Create custom templates

### Advanced (1 day)

1. ✅ Configure production embeddings (OpenAI)
2. ✅ Set up external grant APIs
3. ✅ Customize AI agent prompts
4. ✅ Build custom frontend
5. ✅ Deploy to production

---

## 🚢 Deployment Checklist

### Before Production

- [ ] Configure all environment variables
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for frontend domain
- [ ] Set up error monitoring (Sentry)
- [ ] Configure log aggregation
- [ ] Enable database backups
- [ ] Set up rate limiting
- [ ] Configure file upload limits
- [ ] Test all AI features
- [ ] Load test with realistic data
- [ ] Security audit

### Production Environment Variables

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...  # Production DB
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...          # For embeddings
OPEN_AGENT_SERVER_EXTERNAL_URL=https://yourdomain.com
JWT_SECRET=your-strong-secret
CORS_ORIGIN=https://yourfrontend.com
```

---

## 💡 Pro Tips

### Faster Development

1. **Keep server running**: Uses nodemon, auto-reloads on changes
2. **Use GraphQL variables**: Cleaner than inline arguments
3. **Enable query caching**: Add @cacheControl directives
4. **Use fragments**: Reuse common fields

### Better AI Results

1. **Add org documents**: More context = better proposals
2. **Use user guidance**: Provide specific instructions
3. **Review and regenerate**: Iterate until perfect
4. **Check compliance**: Before final submission

### Database Performance

1. **Use indexes**: Already configured on foreign keys
2. **Enable connection pooling**: PgBouncer recommended
3. **Monitor slow queries**: Enable PostgreSQL logging
4. **Regular vacuuming**: Especially for embeddings table

---

## 🎉 Success!

You now have a **fully functional AI-powered proposal writing platform**!

### What You Can Do

✅ Manage multiple organizations and workspaces
✅ Create proposals from templates
✅ Generate content with 6 AI agents
✅ Search and discover grants
✅ Upload and search documents with RAG
✅ Collaborate with comments and approvals
✅ Track version history
✅ Check compliance automatically

### Next Steps

1. **Customize**: Modify AI agent prompts in `ai/services/proposal-ai.service.ts`
2. **Extend**: Add more templates in seed script
3. **Integrate**: Connect external grant APIs
4. **Build**: Create frontend UI
5. **Deploy**: Launch to production

---

## 📞 Support

- **Documentation**: See docs/ folder
- **Examples**: GRAPHQL_EXAMPLES.md
- **Issues**: Check GitHub issues
- **Community**: Join Discord/Slack

---

## 🙏 Credits

Built with:
- **NestJS** - Backend framework
- **Prisma** - Database ORM
- **GraphQL** - API layer
- **Anthropic Claude** - AI agents
- **pgvector** - Vector search
- **PostgreSQL** - Database

---

**Happy Proposal Writing!** ✍️🚀

*Time to market: 10 minutes from zero to AI-powered proposals!*
