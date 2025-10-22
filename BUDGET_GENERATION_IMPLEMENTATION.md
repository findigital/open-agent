# Budget Generation Feature - Implementation Plan

## Executive Summary
This feature enables AI-powered budget creation for grant proposals using organizational financial history, non-profit best practices, and RAG to ensure accuracy and compliance.

---

## Current System Analysis

### Existing Agents (From `proposal-ai.service.ts`)
1. **Research Agent** - Analyzes grant requirements ✅
2. **Context Agent** - Retrieves org documents ✅
3. **Planning Agent** - Creates outlines ✅
4. **Writing Agent** - Generates narrative ✅
5. **Editing Agent** - Refines content ✅
6. **Compliance Agent** - Checks requirements ✅

### Existing Tools (From `agent-tools.ts`)
1. `search_grants` - Search grant database ✅
2. `get_grant_details` - Fetch grant info ✅
3. `get_organization_context` - RAG search ✅
4. `list_organization_documents` - List docs ✅
5. `get_proposal_template` - Fetch template ✅
6. `get_proposal` - Fetch proposal ✅
7. `check_compliance_requirements` - Compliance check ✅

### What's Missing for Budget Generation

#### Missing Agent
❌ **Budget Agent** - Specialized in financial planning

#### Missing Tools
❌ **Budget Template Tool** - Fetch budget templates
❌ **Historical Budget Tool** - Retrieve past budgets
❌ **Budget Calculator Tool** - Perform calculations
❌ **Excel/CSV Generator Tool** - Export budgets
❌ **Non-Profit Standards Tool** - Apply best practices
❌ **Indirect Cost Calculator** - Calculate overhead

---

## Budget Generation Requirements

### Non-Profit Budget Standards

#### 1. OMB Uniform Guidance (2 CFR 200)
Federal grant budgets must comply with:
- **Direct Costs**: Directly attributable to project
- **Indirect Costs**: Overhead/facilities (negotiated rate)
- **Cost Principles**: Necessary, reasonable, allocable
- **Cost Sharing**: Match requirements
- **Budget Categories**: Personnel, Fringe, Travel, Equipment, Supplies, Contractual, Other

#### 2. Standard Budget Categories
```
A. Personnel
   - Project Director (% FTE, salary, period)
   - Program Staff (positions, salaries)
   - Administrative Staff

B. Fringe Benefits
   - Health insurance
   - Retirement
   - Payroll taxes
   - Workers comp

C. Travel
   - Mileage
   - Airfare
   - Lodging
   - Per diem

D. Equipment (>$5,000 per unit)
   - Computers
   - Vehicles
   - Major equipment

E. Supplies (<$5,000 per unit)
   - Office supplies
   - Program materials
   - Software licenses

F. Contractual
   - Consultants
   - Subcontractors
   - Professional services

G. Other Direct Costs
   - Rent
   - Utilities
   - Insurance
   - Audit costs

H. Indirect Costs
   - Negotiated rate or 10% de minimis

I. Cost Sharing/Match
   - Cash match
   - In-kind contributions
```

#### 3. Budget Narrative Requirements
- Justification for each line item
- Calculation methodology
- Connection to project activities
- Reasonableness explanation

### Data Sources for Budget Generation

#### 1. Organization Documents (RAG Sources)
```
Documents to retrieve:
- Past budgets (990s, audited financials)
- Personnel pay scales
- Fringe benefit rates
- Indirect cost rate agreement
- Past grant budgets
- Organizational budget
- Facilities costs
```

#### 2. Grant Requirements (From RFP/Grant Listing)
```
Extract from grant:
- Maximum budget amount
- Budget categories allowed
- Cost sharing requirements
- Indirect cost policies
- Period of performance
- Budget format requirements
```

#### 3. Non-Profit Standards Database
```
Store:
- Standard fringe benefit rates by state
- Average salaries by position/region
- Typical indirect cost rates
- OMB compliance rules
- Foundation budget templates
```

---

## Implementation Architecture

### 1. New Database Schema

```prisma
model BudgetTemplate {
  id                String   @id @default(cuid())
  organizationId    String?
  name              String
  category          String   // federal, foundation, corporate
  isPublic          Boolean  @default(false)
  lineItems         Json     // Array of budget line items
  totalAmount       Float?
  createdAt         DateTime @default(now())

  organization      Organization? @relation(fields: [organizationId], references: [id])
  budgets           ProposalBudget[]
}

model ProposalBudget {
  id                String   @id @default(cuid())
  proposalId        String   @unique
  templateId        String?
  lineItems         Json     // Detailed budget line items
  totalDirectCosts  Float
  indirectCosts     Float
  indirectRate      Float
  totalCosts        Float
  costSharing       Float?
  narrative         String?  // Budget justification
  exportedFiles     Json?    // URLs to CSV/Excel exports
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  proposal          Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  template          BudgetTemplate? @relation(fields: [templateId], references: [id])

  @@index([proposalId])
}

model OrganizationFinancials {
  id                String   @id @default(cuid())
  organizationId    String
  fiscalYear        Int
  totalRevenue      Float
  totalExpenses     Float
  personnelCosts    Float?
  fringeBenefitRate Float?
  indirectCostRate  Float?
  form990Url        String?  // Link to 990
  auditUrl          String?  // Link to audit
  createdAt         DateTime @default(now())

  organization      Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, fiscalYear])
}

model NonProfitBudgetStandard {
  id                String   @id @default(cuid())
  category          String   // personnel, fringe, travel, etc.
  itemType          String   // salary_range, benefit_rate, mileage_rate
  region            String?  // geographic region
  standard          Json     // Standard values/ranges
  source            String   // OMB, IRS, State, Industry
  effectiveDate     DateTime
  description       String?
}
```

### 2. New Budget Agent

```typescript
// ai/agents/budget-agent.ts

import Anthropic from '@anthropic-ai/sdk';

interface BudgetAgentInput {
  proposalId: string;
  grantId?: string;
  requestedAmount?: number;
  periodMonths: number;
  organizationId: string;
  budgetRequirements?: string;
}

export class BudgetAgent {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateBudget(input: BudgetAgentInput) {
    // 1. Retrieve organization financial context
    const orgContext = await this.getOrganizationFinancialContext(input.organizationId);

    // 2. Retrieve grant budget requirements
    const grantRequirements = input.grantId
      ? await this.getGrantBudgetRequirements(input.grantId)
      : null;

    // 3. Retrieve non-profit standards
    const standards = await this.getNonProfitStandards();

    // 4. Generate budget using Claude
    const budget = await this.generateBudgetWithAI({
      organizationContext: orgContext,
      grantRequirements,
      standards,
      requestedAmount: input.requestedAmount,
      periodMonths: input.periodMonths,
      budgetRequirements: input.budgetRequirements,
    });

    return budget;
  }

  private async getOrganizationFinancialContext(orgId: string) {
    // RAG search for financial documents
    const query = `organization budget history salaries fringe benefits indirect costs personnel expenses`;

    // Search org documents
    const documents = await this.searchOrganizationDocuments(orgId, query);

    // Get structured financial data
    const financials = await this.getOrganizationFinancials(orgId);

    return {
      documents,
      financials,
    };
  }

  private async generateBudgetWithAI(context: any) {
    const systemPrompt = `You are a non-profit budget expert specializing in grant proposal budgets.

Your expertise includes:
- OMB Uniform Guidance (2 CFR 200) compliance
- Federal grant budget requirements
- Foundation and corporate grant budgets
- Non-profit accounting standards
- Budget narratives and justifications

You create detailed, compliant budgets that:
1. Follow funder requirements exactly
2. Use realistic costs based on organization history
3. Include proper justifications
4. Comply with non-profit accounting standards
5. Calculate indirect costs correctly`;

    const userPrompt = `Create a detailed grant proposal budget.

ORGANIZATION FINANCIAL CONTEXT:
${JSON.stringify(context.organizationContext, null, 2)}

GRANT REQUIREMENTS:
${context.grantRequirements || 'Not specified'}

NON-PROFIT STANDARDS:
${JSON.stringify(context.standards, null, 2)}

BUDGET PARAMETERS:
- Requested Amount: $${context.requestedAmount?.toLocaleString() || 'Not specified'}
- Period: ${context.periodMonths} months
- Additional Requirements: ${context.budgetRequirements || 'None'}

Please create a comprehensive budget with the following JSON structure:

{
  "budget_summary": {
    "total_direct_costs": 0,
    "indirect_costs": 0,
    "indirect_rate": 0.10,
    "total_costs": 0,
    "cost_sharing": 0
  },
  "line_items": [
    {
      "category": "Personnel",
      "item": "Project Director",
      "description": "Detailed description",
      "calculation": "Calculation methodology",
      "quantity": 1,
      "unit_cost": 0,
      "total": 0,
      "justification": "Why this cost is necessary and reasonable"
    }
  ],
  "budget_narrative": "Overall budget justification..."
}

Guidelines:
1. Base salaries on organization's documented pay scales
2. Use organization's actual fringe benefit rate
3. Include only costs necessary for the project
4. Ensure costs are reasonable and allocable
5. Calculate indirect costs using organization's rate or 10% de minimis
6. Provide detailed justifications for each line item
7. Stay within requested amount if specified
8. Follow grant-specific budget requirements`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 16000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse budget from AI response');
  }
}
```

### 3. New Budget Tools

```typescript
// ai/tools/budget-tools.ts

export const budgetTools = [
  {
    name: 'get_organization_financials',
    description: 'Retrieve organization financial data including salaries, fringe rates, and indirect costs',
    input_schema: {
      type: 'object',
      properties: {
        organization_id: {
          type: 'string',
          description: 'Organization ID',
        },
        fiscal_year: {
          type: 'number',
          description: 'Fiscal year (optional, defaults to most recent)',
        },
      },
      required: ['organization_id'],
    },
  },
  {
    name: 'search_budget_templates',
    description: 'Search for budget templates by category (federal, foundation, corporate)',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['federal', 'foundation', 'corporate'],
        },
        organization_id: {
          type: 'string',
          description: 'Filter by organization (optional)',
        },
      },
    },
  },
  {
    name: 'get_nonprofit_standards',
    description: 'Get non-profit budget standards and best practices',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Budget category (personnel, fringe, travel, etc.)',
        },
        region: {
          type: 'string',
          description: 'Geographic region for regional standards',
        },
      },
    },
  },
  {
    name: 'calculate_indirect_costs',
    description: 'Calculate indirect costs using organization rate or 10% de minimis',
    input_schema: {
      type: 'object',
      properties: {
        direct_costs: {
          type: 'number',
          description: 'Total direct costs',
        },
        organization_id: {
          type: 'string',
        },
        use_de_minimis: {
          type: 'boolean',
          description: 'Use 10% de minimis rate instead of organization rate',
        },
      },
      required: ['direct_costs', 'organization_id'],
    },
  },
  {
    name: 'export_budget_csv',
    description: 'Export budget to CSV format',
    input_schema: {
      type: 'object',
      properties: {
        budget_id: {
          type: 'string',
        },
        format: {
          type: 'string',
          enum: ['csv', 'excel'],
        },
      },
      required: ['budget_id'],
    },
  },
];
```

### 4. CSV/Excel Export Service

```typescript
// services/budget-export.service.ts

import * as ExcelJS from 'exceljs';
import { Parser } from 'json2csv';

export class BudgetExportService {
  /**
   * Export budget to CSV
   */
  async exportToCSV(budget: any): Promise<string> {
    const fields = [
      'category',
      'item',
      'description',
      'quantity',
      'unit_cost',
      'total',
      'justification',
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(budget.line_items);

    // Save to file storage and return URL
    const filename = `budget-${Date.now()}.csv`;
    const url = await this.saveFile(filename, csv);

    return url;
  }

  /**
   * Export budget to Excel with formatting
   */
  async exportToExcel(budget: any): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Budget');

    // Header
    worksheet.columns = [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Item', key: 'item', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Unit Cost', key: 'unit_cost', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Justification', key: 'justification', width: 50 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Add line items
    budget.line_items.forEach((item: any) => {
      worksheet.addRow({
        category: item.category,
        item: item.item,
        description: item.description,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total: item.total,
        justification: item.justification,
      });
    });

    // Add summary
    worksheet.addRow({});
    worksheet.addRow({
      category: 'TOTALS',
      total: budget.budget_summary.total_direct_costs,
    }).font = { bold: true };

    worksheet.addRow({
      category: 'Indirect Costs',
      description: `${(budget.budget_summary.indirect_rate * 100).toFixed(1)}%`,
      total: budget.budget_summary.indirect_costs,
    });

    worksheet.addRow({
      category: 'TOTAL BUDGET',
      total: budget.budget_summary.total_costs,
    }).font = { bold: true };

    // Number formatting
    worksheet.getColumn('unit_cost').numFmt = '$#,##0.00';
    worksheet.getColumn('total').numFmt = '$#,##0.00';

    // Save
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `budget-${Date.now()}.xlsx`;
    const url = await this.saveFile(filename, buffer);

    return url;
  }

  /**
   * Export budget narrative to Word document
   */
  async exportNarrativeToWord(budget: any): Promise<string> {
    // TODO: Implement Word export using docx library
    return '';
  }

  private async saveFile(filename: string, content: any): Promise<string> {
    // TODO: Implement S3 or local file storage
    return `/exports/${filename}`;
  }
}
```

---

## Frontend Implementation

### 1. Budget Builder Component

```typescript
// pages/proposals/budget-builder.tsx

export const BudgetBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const [budget, setBudget] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);

  const handleGenerateBudget = async () => {
    setGenerating(true);
    try {
      const res = await gql({
        query: `
          mutation GenerateBudget($proposalId: ID!) {
            generateBudget(proposalId: $proposalId) {
              id
              lineItems
              totalDirectCosts
              indirectCosts
              totalCosts
              narrative
            }
          }
        `,
        variables: { proposalId: id },
      });

      setBudget(res.data.generateBudget);
      toast.success('Budget generated successfully!');
    } catch (error) {
      toast.error('Failed to generate budget');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const res = await gql({
        query: `
          mutation ExportBudget($budgetId: ID!, $format: String!) {
            exportBudget(budgetId: $budgetId, format: $format) {
              fileUrl
            }
          }
        `,
        variables: { budgetId: budget.id, format },
      });

      window.open(res.data.exportBudget.fileUrl, '_blank');
      toast.success(`Budget exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  return (
    <div>
      {/* Budget header with generate and export buttons */}
      {/* Budget line items table with inline editing */}
      {/* Budget summary totals */}
      {/* Budget narrative editor */}
    </div>
  );
};
```

---

## RAG Integration Strategy

### 1. Document Types for Budget RAG

```typescript
// Documents to embed and retrieve:
const budgetRelevantDocs = [
  // Financial documents
  'Form 990 (IRS)',
  'Audited financial statements',
  'Organization budget',
  'Pay scale/salary schedule',
  'Fringe benefit summary',
  'Indirect cost rate agreement',

  // Past budgets
  'Previous grant budgets',
  'Budget narratives',
  'Personnel descriptions',

  // Policies
  'Travel policy',
  'Procurement policy',
  'Personnel policies',
  'Financial policies',
];
```

### 2. RAG Query Examples

```typescript
// Retrieve salary information
const salaryQuery = "project director salary annual compensation full-time equivalent";

// Retrieve fringe benefit rate
const fringeQuery = "employee benefits health insurance retirement payroll taxes rate percentage";

// Retrieve indirect cost rate
const indirectQuery = "indirect costs overhead facilities administration negotiated rate agreement";

// Retrieve past budget examples
const pastBudgetQuery = "grant budget line items personnel travel equipment past proposal";
```

### 3. Context Building for Budget Agent

```typescript
async function buildBudgetContext(organizationId: string, projectDescription: string) {
  const contexts = await Promise.all([
    // Get salary data
    embeddingService.semanticSearch(
      organizationId,
      "staff salaries compensation rates",
      5
    ),

    // Get benefit rates
    embeddingService.semanticSearch(
      organizationId,
      "fringe benefits employee benefits rate",
      3
    ),

    // Get indirect cost info
    embeddingService.semanticSearch(
      organizationId,
      "indirect costs overhead rate",
      3
    ),

    // Get past budgets for similar projects
    embeddingService.semanticSearch(
      organizationId,
      `past grant budget ${projectDescription}`,
      5
    ),
  ]);

  return {
    salaryContext: contexts[0],
    benefitsContext: contexts[1],
    indirectContext: contexts[2],
    pastBudgets: contexts[3],
  };
}
```

---

## Evaluation: Current System Capabilities

### ✅ What We Have
1. **RAG System**: pgvector with embeddings ✅
2. **Document Storage**: Organization documents ✅
3. **AI Integration**: Claude 3.5 Sonnet ✅
4. **Multi-Agent System**: Sequential workflow ✅
5. **Tool Calling**: Existing tool framework ✅
6. **GraphQL API**: Extensible schema ✅

### ❌ What We Need to Add
1. **Budget Agent**: NEW specialized agent needed
2. **Budget Tools**: 5-6 new tools required
3. **Budget Schema**: Database tables for budgets
4. **Export Service**: CSV/Excel generation
5. **Standards Database**: Non-profit budget standards
6. **UI Components**: Budget builder interface

### Assessment

**Current Agent System**: ⚠️ **Partially Adequate**
- ✅ Context Agent can retrieve org documents
- ✅ Tool framework supports new budget tools
- ❌ No dedicated budget expertise in current agents
- ❌ Writing Agent not optimized for financial data

**Recommendation**: **Add Budget Agent**
- Specialized prompting for financial accuracy
- Dedicated budget generation workflow
- Integration with existing Context Agent for RAG

**Current Tools**: ❌ **Insufficient**
- Need budget-specific tools
- Need calculation tools
- Need export tools

**Recommendation**: **Add 6 Budget Tools**
1. `get_organization_financials`
2. `search_budget_templates`
3. `get_nonprofit_standards`
4. `calculate_indirect_costs`
5. `export_budget_csv`
6. `export_budget_excel`

---

## Implementation Priority

### Phase 1: Core Budget Generation (2-3 weeks)
1. ✅ Database schema for budgets
2. ✅ Budget Agent implementation
3. ✅ Basic budget tools (financials, templates)
4. ✅ RAG integration for org docs
5. ✅ Simple budget generation

### Phase 2: Standards & Compliance (1-2 weeks)
1. ✅ Non-profit standards database
2. ✅ OMB compliance rules
3. ✅ Indirect cost calculator
4. ✅ Budget validation

### Phase 3: Export & UI (1-2 weeks)
1. ✅ CSV export
2. ✅ Excel export with formatting
3. ✅ Budget builder UI
4. ✅ Inline editing
5. ✅ Budget narrative editor

### Phase 4: Advanced Features (2-3 weeks)
1. ✅ Budget templates library
2. ✅ Multi-year budgets
3. ✅ Cost sharing tracking
4. ✅ Budget vs actual tracking
5. ✅ Budget amendment support

---

## Dependencies

```json
{
  "exceljs": "^4.4.0",
  "json2csv": "^6.0.0",
  "docx": "^8.5.0"
}
```

---

## Success Metrics

1. **Budget Generation Time**: <5 minutes
2. **Accuracy**: 90%+ of line items need no editing
3. **Compliance**: 100% compliant with OMB standards
4. **RAG Relevance**: Retrieve correct salary data 95%+ of time
5. **User Satisfaction**: 4.5+ stars on budget feature

---

## Conclusion

**Current System Assessment**:
- ✅ Infrastructure supports budget feature
- ✅ RAG system can retrieve financial docs
- ❌ Need specialized Budget Agent
- ❌ Need budget-specific tools
- ❌ Need export capabilities

**Recommended Approach**:
1. Add Budget Agent to existing multi-agent system
2. Implement 6 budget-specific tools
3. Build on existing RAG for document retrieval
4. Use Claude's calculation abilities
5. Add CSV/Excel export service

**Estimated Effort**: 6-8 weeks for full implementation

**Business Value**:
- Save 3-5 hours per budget
- Ensure compliance with standards
- Use organization's actual financial data
- Professional budget formatting
- Reduce budget errors by 80%+

This feature will make budget creation from "dreaded task" to "5-minute AI generation"! 🎯
