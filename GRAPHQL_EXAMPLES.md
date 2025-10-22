# GraphQL API Examples - Proposal Writing SaaS

Complete examples for testing all API operations.

**GraphQL Playground**: http://localhost:8080/graphql

---

## 🔐 Authentication

All requests require authentication. Include user context in headers or use the existing auth system.

---

## 📁 Organizations

### Get My Organizations

```graphql
query MyOrganizations {
  myOrganizations {
    id
    name
    slug
    type
    mission
    createdAt
    members {
      user {
        name
        email
      }
      role
    }
  }
}
```

### Get Single Organization

```graphql
query GetOrganization {
  organization(id: "org_123") {
    id
    name
    slug
    mission
    workspaces {
      id
      name
      proposalCount
      templateCount
    }
    members {
      user {
        name
        email
      }
      role
    }
  }
}
```

### Create Organization

```graphql
mutation CreateOrganization {
  createOrganization(input: {
    name: "My Awesome Nonprofit"
    slug: "my-awesome-nonprofit"
    type: "nonprofit"
    mission: "Making the world a better place through community action"
    taxId: "12-3456789"
  }) {
    id
    name
    slug
  }
}
```

### Add Organization Member

```graphql
mutation AddMember {
  addOrganizationMember(input: {
    organizationId: "org_123"
    userId: "user_456"
    role: "member"
  }) {
    id
    role
    user {
      name
      email
    }
  }
}
```

---

## 📂 Workspaces

### Get Workspaces

```graphql
query GetWorkspaces {
  workspaces(organizationId: "org_123") {
    id
    name
    description
    proposalCount
    templateCount
    createdAt
  }
}
```

### Create Workspace

```graphql
mutation CreateWorkspace {
  createWorkspace(input: {
    organizationId: "org_123"
    name: "Grant Applications 2025"
    description: "All grant proposals for 2025"
  }) {
    id
    name
  }
}
```

---

## 📝 Proposals

### List Proposals

```graphql
query ListProposals {
  proposals(workspaceId: "workspace_123", status: draft) {
    id
    title
    status
    dueDate
    requestedAmount
    wordCount
    completionPercentage
    sections {
      id
      title
      wordCount
      completed
    }
  }
}
```

### Get Proposal Details

```graphql
query GetProposal {
  proposal(id: "proposal_123") {
    id
    title
    clientName
    status
    dueDate
    requestedAmount
    wordCount
    completionPercentage
    pendingApprovals

    sections {
      id
      title
      type
      content
      wordCount
      wordLimit
      order
      completed
    }

    versions {
      id
      versionNumber
      createdAt
      comment
      createdBy
    }

    approvals {
      id
      status
      comment
      approver {
        name
        email
      }
      respondedAt
    }

    comments {
      id
      content
      resolved
      user {
        name
      }
      createdAt
    }
  }
}
```

### Create Proposal

```graphql
mutation CreateProposal {
  createProposal(input: {
    workspaceId: "workspace_123"
    templateId: "template_456"
    grantId: "grant_789"
    title: "Environmental Education Grant Application"
    clientName: "Environmental Protection Agency"
    requestedAmount: 250000
    dueDate: "2025-06-30T00:00:00Z"
  }) {
    id
    title
    status
    sections {
      id
      title
    }
  }
}
```

### Update Proposal

```graphql
mutation UpdateProposal {
  updateProposal(id: "proposal_123", input: {
    title: "Updated Title"
    requestedAmount: 300000
  }) {
    id
    title
    requestedAmount
  }
}
```

### Update Proposal Status

```graphql
mutation UpdateStatus {
  updateProposalStatus(id: "proposal_123", status: in_review) {
    id
    status
  }
}
```

---

## 📄 Proposal Sections

### Create Section

```graphql
mutation CreateSection {
  createProposalSection(input: {
    proposalId: "proposal_123"
    title: "Executive Summary"
    type: "text"
    order: 1
    wordLimit: 500
  }) {
    id
    title
  }
}
```

### Update Section

```graphql
mutation UpdateSection {
  updateProposalSection(id: "section_123", input: {
    content: """
    This proposal requests $250,000 to expand our environmental education
    program to serve 5,000 additional community members...
    """
  }) {
    id
    content
    wordCount
  }
}
```

### Reorder Sections

```graphql
mutation ReorderSections {
  reorderProposalSections(
    proposalId: "proposal_123"
    sectionIds: ["section_1", "section_3", "section_2", "section_4"]
  ) {
    id
    title
    order
  }
}
```

---

## 🤖 AI-Powered Generation

### Generate Proposal Section with AI

```graphql
mutation GenerateSection {
  generateProposalSection(input: {
    proposalId: "proposal_123"
    sectionId: "section_456"
    grantId: "grant_789"
    userGuidance: "Emphasize our 10-year track record and focus on measurable outcomes"
  }) {
    sectionId
    content
    wordCount
    confidence
    suggestions
    sources
  }
}
```

**What Happens**:
1. Research Agent analyzes the grant
2. Context Agent retrieves org documents
3. Planning Agent creates outline
4. Writing Agent generates content
5. Editing Agent polishes result
6. Auto-saves with version snapshot

### Regenerate Section

```graphql
mutation RegenerateSection {
  regenerateProposalSection(
    proposalId: "proposal_123"
    sectionId: "section_456"
    userGuidance: "Make it more concise and add specific metrics"
  ) {
    sectionId
    content
    wordCount
    confidence
  }
}
```

### Check Compliance

```graphql
mutation CheckCompliance {
  checkProposalCompliance(
    proposalId: "proposal_123"
    grantId: "grant_789"
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

**Sample Response**:
```json
{
  "compliant": false,
  "score": 75,
  "issues": [
    {
      "severity": "warning",
      "section": "Budget Narrative",
      "issue": "Word count is below recommended minimum",
      "suggestion": "Add more detail to budget justifications"
    },
    {
      "severity": "error",
      "section": "Eligibility",
      "issue": "Requested amount exceeds maximum",
      "suggestion": "Reduce requested amount to $250,000 or less"
    }
  ],
  "recommendations": [
    "Complete all required sections before submission",
    "Review eligibility criteria carefully",
    "Consider requesting amount at lower end of range"
  ]
}
```

---

## 📋 Templates

### List Templates

```graphql
query ListTemplates {
  proposalTemplates(workspaceId: "workspace_123") {
    id
    name
    description
    category
    isPublic
    usageCount
    sections {
      id
      title
      description
      type
      wordLimit
      required
      promptGuidance
    }
  }
}
```

### Get Public Templates

```graphql
query PublicTemplates {
  proposalTemplates(publicOnly: true, category: "government") {
    id
    name
    description
    category
    sections {
      title
      wordLimit
    }
  }
}
```

### Create Template

```graphql
mutation CreateTemplate {
  createProposalTemplate(input: {
    workspaceId: "workspace_123"
    name: "Custom Foundation Grant Template"
    description: "Template for regional foundation grants"
    category: "foundation"
    isPublic: false
  }) {
    id
    name
  }
}
```

### Clone Template

```graphql
mutation CloneTemplate {
  cloneProposalTemplate(
    id: "template_123"
    workspaceId: "workspace_456"
  ) {
    id
    name
  }
}
```

---

## 💰 Grant Discovery

### Search Grants

```graphql
query SearchGrants {
  searchGrants(input: {
    keywords: ["environmental", "education"]
    category: ["education", "environment"]
    minAmount: 50000
    maxAmount: 500000
    openOnly: true
    limit: 10
  }) {
    id
    title
    funderName
    description
    eligibility
    minAmount
    maxAmount
    closeDate
    url
  }
}
```

### Get Grant Details

```graphql
query GetGrant {
  grantOpportunity(id: "grant_123") {
    id
    title
    funderName
    description
    eligibility
    category
    keywords
    minAmount
    maxAmount
    openDate
    closeDate
    url
    source
  }
}
```

### Get Recommended Grants

```graphql
query RecommendedGrants {
  recommendedGrants(organizationId: "org_123", limit: 5) {
    id
    title
    funderName
    maxAmount
    closeDate
  }
}
```

### Grant Statistics

```graphql
query GrantStats {
  grantStats {
    total
    open
    byCategory {
      education
      health
      environment
    }
    bySource {
      grants_gov
      foundation_directory
    }
  }
}
```

---

## 📄 Organization Documents

### Upload Document

```graphql
mutation UploadDocument {
  uploadOrganizationDocument(input: {
    organizationId: "org_123"
    title: "2024 Annual Report"
    type: "annual_report"
    content: """
    Full text of annual report...
    """
    metadata: {
      year: 2024
      pages: 45
    }
  }) {
    id
    title
    type
    embeddingsCount
  }
}
```

### List Documents

```graphql
query ListDocuments {
  organizationDocuments(
    organizationId: "org_123"
    type: "mission"
  ) {
    id
    title
    type
    createdAt
    embeddingsCount
  }
}
```

### Document Statistics

```graphql
query DocumentStats {
  organizationDocumentStats(organizationId: "org_123") {
    total
    byType {
      mission
      annual_report
      program_description
      impact_story
    }
    totalEmbeddings
  }
}
```

---

## ✅ Approvals

### Add Approver

```graphql
mutation AddApprover {
  addProposalApproval(input: {
    proposalId: "proposal_123"
    approverUserId: "user_456"
  }) {
    id
    status
    approver {
      name
      email
    }
  }
}
```

### Submit Approval Decision

```graphql
mutation SubmitApproval {
  updateProposalApproval(id: "approval_123", input: {
    status: approved
    comment: "Excellent work! This proposal is ready for submission."
  }) {
    id
    status
    comment
    respondedAt
  }
}
```

### Get My Pending Approvals

```graphql
query MyPendingApprovals {
  myPendingApprovals {
    id
    proposal {
      id
      title
      workspace {
        name
        organization {
          name
        }
      }
    }
    createdAt
  }
}
```

### Approval Statistics

```graphql
query ApprovalStats {
  proposalApprovalStats(proposalId: "proposal_123") {
    total
    pending
    approved
    rejected
    changesRequested
  }
}
```

---

## 💬 Comments

### Add Comment

```graphql
mutation AddComment {
  createProposalComment(input: {
    proposalId: "proposal_123"
    sectionId: "section_456"  # optional - for section-specific comments
    content: "Great point about community impact! Consider adding specific metrics."
  }) {
    id
    content
    user {
      name
    }
    createdAt
  }
}
```

### Get Comments

```graphql
query GetComments {
  proposalComments(proposalId: "proposal_123") {
    id
    content
    resolved
    sectionId
    user {
      name
      email
    }
    createdAt
  }
}
```

### Get Section Comments

```graphql
query SectionComments {
  sectionComments(sectionId: "section_123") {
    id
    content
    resolved
    user {
      name
    }
    createdAt
  }
}
```

### Resolve Comment

```graphql
mutation ResolveComment {
  resolveProposalComment(id: "comment_123") {
    id
    resolved
  }
}
```

### Activity Feed

```graphql
query MyActivityFeed {
  myActivityFeed(limit: 20) {
    id
    content
    proposal {
      title
      workspace {
        name
      }
    }
    user {
      name
    }
    createdAt
  }
}
```

---

## 🔄 Version History

### Create Version Snapshot

```graphql
mutation CreateVersion {
  createProposalVersion(
    proposalId: "proposal_123"
    comment: "Final draft before submission"
  ) {
    id
    versionNumber
    createdAt
  }
}
```

### Restore Previous Version

```graphql
mutation RestoreVersion {
  restoreProposalVersion(versionId: "version_123") {
    id
    title
    sections {
      title
      content
    }
  }
}
```

---

## 📊 Complex Queries

### Complete Proposal Workflow

```graphql
query CompleteWorkflow {
  myOrganizations {
    id
    name
    workspaces {
      id
      name
      proposals(status: draft) {
        id
        title
        completionPercentage
        pendingApprovals
        sections {
          title
          completed
        }
        comments {
          resolved
        }
      }
    }
  }
}
```

### Dashboard Data

```graphql
query DashboardData {
  myOrganizations {
    name
    workspaces {
      name
      proposals {
        status
      }
    }
  }

  myPendingApprovals {
    proposal {
      title
      dueDate
    }
  }

  myActivityFeed(limit: 10) {
    content
    createdAt
  }
}
```

---

## 🔐 Testing with Seed Data

After running `yarn prisma db seed`, use these credentials:

**Login**:
- Email: `admin@nonprofit.org`
- Password: `password123`

**Test Organizations**:
- Green Future Foundation
- Community Health Alliance

**Test Grants**:
- Environmental Education and Outreach Grant ($50K-$250K)
- Community Health Initiatives Grant ($100K-$500K)
- Youth Development and Leadership Grant ($25K-$100K)

---

## 💡 Pro Tips

### Variables

Use GraphQL variables for cleaner queries:

```graphql
mutation GenerateSection($input: ProposalGenerationInput!) {
  generateProposalSection(input: $input) {
    content
    wordCount
  }
}
```

Variables:
```json
{
  "input": {
    "proposalId": "proposal_123",
    "sectionId": "section_456"
  }
}
```

### Fragments

Reuse common fields:

```graphql
fragment ProposalFields on Proposal {
  id
  title
  status
  wordCount
  completionPercentage
}

query GetProposals {
  proposals(workspaceId: "workspace_123") {
    ...ProposalFields
  }
}
```

### Aliases

Query same field with different arguments:

```graphql
query MultipleStatuses {
  drafts: proposals(workspaceId: "workspace_123", status: draft) {
    id
    title
  }

  inReview: proposals(workspaceId: "workspace_123", status: in_review) {
    id
    title
  }
}
```

---

## 🚀 Next Steps

1. **Run Seed Script**: `yarn prisma db seed`
2. **Start Server**: `yarn dev`
3. **Open Playground**: http://localhost:8080/graphql
4. **Try Queries**: Start with `myOrganizations`
5. **Test AI**: Use `generateProposalSection`
6. **Explore**: Try different combinations!

---

**Happy Testing!** 🎉
