# Getting Started with Proposal SaaS Platform

> **AI-Powered Grant Proposal Writing for Non-Profit Organizations**

This guide will help you get the Proposal SaaS platform up and running in **under 10 minutes**.

---

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** installed
- **Anthropic API Key** ([Get one here](https://console.anthropic.com/))
- **Git** installed

### Installation (3 Steps)

```bash
# 1. Clone the repository
git clone <repository-url>
cd open-agent

# 2. Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Deploy
./deploy.sh development
```

**That's it!** The platform is now running.

---

## 🎯 Access Points

Once deployed, access the following:

| Service | URL | Purpose |
|---------|-----|---------|
| **GraphQL Playground** | http://localhost:8080/graphql | Interactive API explorer |
| **API Health Check** | http://localhost:8080/health | Service status |
| **pgAdmin** | http://localhost:5050 | Database management |

### pgAdmin Login
- **Email:** `admin@proposal-saas.local`
- **Password:** `admin`

### Test User Credentials
- **Email:** `admin@nonprofit.org`
- **Password:** `password123`

---

## 📚 Your First Proposal

### Step 1: Create an Organization

```graphql
mutation CreateOrg {
  createOrganization(input: {
    name: "My Non-Profit"
    mission: "Making the world better"
    contactEmail: "contact@mynpo.org"
  }) {
    id
    name
  }
}
```

### Step 2: Create a Workspace

```graphql
mutation CreateWorkspace {
  createWorkspace(input: {
    organizationId: "<org-id-from-step-1>"
    name: "Grant Applications 2024"
    description: "All our 2024 grant proposals"
  }) {
    id
    name
  }
}
```

### Step 3: Upload Organization Documents

```graphql
mutation UploadDocument {
  createDocument(input: {
    organizationId: "<org-id>"
    title: "Organization Mission Statement"
    type: mission
    content: "Our mission is to provide environmental education..."
  }) {
    id
    title
  }
}
```

### Step 4: Create a Proposal from Template

```graphql
mutation CreateProposal {
  createProposal(input: {
    workspaceId: "<workspace-id>"
    templateId: "<template-id>"  # Use one from seed data
    title: "EPA Environmental Grant Application"
    requestedAmount: 75000
    dueDate: "2024-12-31"
  }) {
    id
    title
    sections {
      id
      title
      type
    }
  }
}
```

### Step 5: Generate Section with AI 🤖

```graphql
mutation GenerateSection {
  generateProposalSection(input: {
    proposalId: "<proposal-id>"
    sectionId: "<section-id>"
    userGuidance: "Emphasize our 10-year track record in environmental education"
  }) {
    sectionId
    content
    wordCount
    confidence
    suggestions
  }
}
```

**The AI will:**
1. Research the grant requirements
2. Retrieve relevant organization documents
3. Create a detailed outline
4. Write compelling content
5. Edit and polish the result

---

## 🔍 Exploring the Platform

### Search for Grants

```graphql
query SearchGrants {
  searchGrants(
    keywords: ["environment", "education"]
    minAmount: 50000
    maxAmount: 150000
    openOnly: true
  ) {
    id
    title
    funderName
    maxAmount
    closeDate
    eligibility
  }
}
```

### View Available Templates

```graphql
query GetTemplates {
  proposalTemplates(category: foundation) {
    id
    name
    description
    sections {
      title
      description
      wordLimit
      required
    }
  }
}
```

### Request Approval

```graphql
mutation RequestApproval {
  requestApproval(
    proposalId: "<proposal-id>"
    approverId: "<user-id>"
    level: 1
    dueDate: "2024-12-15"
  ) {
    id
    status
    approver {
      name
      email
    }
  }
}
```

### Add a Comment

```graphql
mutation AddComment {
  createComment(input: {
    proposalId: "<proposal-id>"
    sectionId: "<section-id>"
    content: "Great start! Can we add more specific metrics?"
  }) {
    id
    content
    author {
      name
    }
    createdAt
  }
}
```

### Check Compliance

```graphql
mutation CheckCompliance {
  checkProposalCompliance(
    proposalId: "<proposal-id>"
    grantId: "<grant-id>"
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

## 📖 Understanding the Data Model

### Hierarchy

```
Organization (Your Non-Profit)
  └── Workspace (Project Container)
       ├── Proposal (Grant Application)
       │    ├── Section 1: Executive Summary
       │    ├── Section 2: Problem Statement
       │    ├── Section 3: Methods
       │    └── Section 4: Budget
       │
       └── Documents (Knowledge Base)
            ├── Mission Statement
            ├── Annual Report
            └── Program Descriptions
```

### Key Entities

| Entity | Purpose | Example |
|--------|---------|---------|
| **Organization** | Your non-profit | "Green Future Foundation" |
| **Workspace** | Project grouping | "Grant Applications 2024" |
| **Proposal** | Grant application | "EPA Grant - $100K" |
| **Section** | Proposal component | "Executive Summary" |
| **Template** | Reusable structure | "Foundation Grant Template" |
| **Grant** | Funding opportunity | "EPA Environmental Education Grant" |
| **Document** | Organization knowledge | "Mission Statement 2024" |

---

## 🤖 AI Features

### Multi-Agent System

The platform uses 6 specialized AI agents:

1. **Research Agent** - Analyzes grant requirements
2. **Context Agent** - Retrieves organization documents
3. **Planning Agent** - Creates section outlines
4. **Writing Agent** - Generates compelling content
5. **Editing Agent** - Refines and polishes
6. **Compliance Agent** - Checks requirements

### RAG (Retrieval Augmented Generation)

The AI uses your organization's documents for context:

```graphql
# 1. Upload documents
mutation UploadDoc {
  createDocument(input: { ... }) { id }
}

# 2. Generate embeddings
mutation GenerateEmbeddings {
  generateDocumentEmbeddings(documentId: "<doc-id>")
}

# 3. Semantic search works automatically
query SearchDocs {
  searchDocuments(
    organizationId: "<org-id>"
    query: "environmental education programs"
  ) {
    documentTitle
    chunkText
    similarity
  }
}
```

### AI Tools Available

The AI can use these 7 tools:

1. `search_grants` - Find grant opportunities
2. `get_grant_details` - Get grant information
3. `get_organization_context` - Retrieve documents
4. `list_organization_documents` - Browse knowledge base
5. `get_proposal_template` - Access templates
6. `get_proposal` - Read proposal state
7. `check_compliance_requirements` - Validate eligibility

---

## 🔧 Common Tasks

### Regenerate a Section

```graphql
mutation RegenerateSection {
  regenerateProposalSection(
    sectionId: "<section-id>"
    proposalId: "<proposal-id>"
    userGuidance: "Make it more concise and focus on measurable outcomes"
  ) {
    content
    wordCount
    suggestions
  }
}
```

### Update Proposal Status

```graphql
mutation UpdateStatus {
  changeProposalStatus(
    proposalId: "<proposal-id>"
    status: in_review
  ) {
    id
    status
  }
}
```

### View Proposal History

```graphql
query GetVersions {
  proposal(id: "<proposal-id>") {
    versions {
      versionNumber
      createdAt
      createdBy
      comment
      content
    }
  }
}
```

---

## 🛠️ Development Commands

### Database

```bash
# Run migrations
yarn prisma migrate deploy

# Seed test data
yarn prisma db seed

# Open Prisma Studio
yarn prisma studio

# Generate Prisma Client
yarn prisma generate
```

### Docker

```bash
# View logs
docker-compose -f docker-compose.proposal-saas.yml logs -f backend

# Restart services
docker-compose -f docker-compose.proposal-saas.yml restart

# Stop all services
docker-compose -f docker-compose.proposal-saas.yml down

# View running containers
docker-compose -f docker-compose.proposal-saas.yml ps
```

### Embeddings

```bash
# Generate embeddings for all documents
docker-compose -f docker-compose.proposal-saas.yml exec backend \
  yarn ts-node scripts/generate-embeddings.ts --all

# Generate for specific organization
docker-compose -f docker-compose.proposal-saas.yml exec backend \
  yarn ts-node scripts/generate-embeddings.ts --org <org-id>
```

---

## 📧 Email Notifications

The platform sends email notifications for:

- ✅ Approval requests
- ✅ Approval decisions
- ✅ New comments
- ✅ Proposal status changes
- ✅ AI generation complete

### Configure SMTP

Edit `.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourproposalsaas.com
```

For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833).

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.proposal-saas.yml logs backend

# Common issues:
# 1. Missing ANTHROPIC_API_KEY in .env
# 2. PostgreSQL not ready (wait 30 seconds and retry)
# 3. Port 8080 already in use
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
docker-compose -f docker-compose.proposal-saas.yml ps postgres

# Check health
docker-compose -f docker-compose.proposal-saas.yml exec postgres \
  pg_isready -U openagent
```

### AI Generation Fails

**Check:**
1. `ANTHROPIC_API_KEY` is set correctly in `.env`
2. API key has sufficient credits
3. View backend logs for error details

```bash
docker-compose -f docker-compose.proposal-saas.yml logs backend | grep ERROR
```

### Embeddings Not Working

**For development:**
- Embeddings use placeholders by default (random vectors)
- This is intentional for quick testing

**For production:**
- Set `OPENAI_API_KEY` in `.env`
- Run: `yarn ts-node scripts/generate-embeddings.ts --all`

---

## 📚 Additional Resources

### Documentation

- **[PROPOSAL_SAAS_BUILD_SUMMARY.md](./PROPOSAL_SAAS_BUILD_SUMMARY.md)** - Complete technical documentation
- **[GRAPHQL_EXAMPLES.md](./GRAPHQL_EXAMPLES.md)** - 60+ API examples
- **[QUICKSTART.md](./QUICKSTART.md)** - Detailed setup guide
- **[.env.example](./.env.example)** - Configuration reference

### GraphQL Playground Tips

1. **Enable Docs Panel** - Click "DOCS" on the right to see schema
2. **Auto-complete** - Press `Ctrl+Space` for suggestions
3. **Format Code** - Press `Ctrl+Shift+F` to format queries
4. **History** - Click "HISTORY" to see past queries

### Seeded Test Data

The platform comes with test data:

- **4 Users** (admin@nonprofit.org, etc.)
- **2 Organizations** (Green Future Foundation, Community Health Alliance)
- **4 Workspaces**
- **9 Documents** (missions, reports, impact stories)
- **4 Templates** (foundation, federal, corporate, research)
- **3 Grants** ($25K-$500K range)
- **2 Proposals** (with sections, approvals, comments)

Login with:
```
Email: admin@nonprofit.org
Password: password123
```

---

## 🎯 Next Steps

Now that you're set up:

1. **Explore the GraphQL API** - Try the examples in GraphQL Playground
2. **Generate Your First Proposal** - Follow the workflow above
3. **Test AI Generation** - See the multi-agent system in action
4. **Add Your Documents** - Build your organization's knowledge base
5. **Invite Team Members** - Collaborate on proposals

### Want to Deploy to Production?

```bash
# 1. Update .env with production values
# 2. Set strong secrets (JWT_SECRET, passwords)
# 3. Configure SMTP for emails
# 4. Set up domain and SSL/TLS
# 5. Deploy

./deploy.sh production
```

---

## 💡 Pro Tips

1. **Use Templates** - Start with pre-built templates to save time
2. **Upload Documents First** - Better AI context = better proposals
3. **Provide User Guidance** - Tell the AI what to emphasize
4. **Review and Iterate** - Regenerate sections with feedback
5. **Check Compliance Early** - Catch issues before submission
6. **Version Control** - Proposals auto-save versions after AI generation
7. **Collaborate** - Use comments and approvals for team review

---

## 🆘 Need Help?

- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Email:** support@yourproposalsaas.com
- **Documentation:** Full docs in `PROPOSAL_SAAS_BUILD_SUMMARY.md`

---

## 🎉 You're Ready!

You now have a **production-ready, AI-powered grant proposal platform**. Start creating compelling proposals and securing funding for your non-profit organization!

**Happy Proposal Writing! 🚀**
