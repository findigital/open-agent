# Budget Generation - Gap Closure Implementation Plan

## Overview
This document provides a **step-by-step implementation plan** to close the gaps identified in the budget generation analysis. Each section includes concrete code, file locations, and testing criteria.

---

## Gap Summary

| Gap | Priority | Effort | Dependencies |
|-----|----------|--------|--------------|
| 1. Database Schema | 🔴 Critical | 2 days | None |
| 2. Budget Agent | 🔴 Critical | 3-4 days | Database, Tools |
| 3. Budget Tools (6 tools) | 🔴 Critical | 3-4 days | Database |
| 4. Export Service | 🟡 High | 2-3 days | Database |
| 5. Non-Profit Standards DB | 🟡 High | 2 days | Database |
| 6. Budget Builder UI | 🟡 High | 4-5 days | All backend |
| 7. Integration & Testing | 🟢 Medium | 2-3 days | All above |

**Total Estimated Time**: 18-24 days (3.5-4.5 weeks)

---

## Implementation Phases

### Phase 1: Foundation (Days 1-4) - DATABASE & CORE TOOLS

#### Task 1.1: Database Schema Implementation ⏱️ 2 days

**File**: `packages/backend/server/prisma/schema.prisma`

```prisma
// Add to existing schema.prisma

model ProposalBudget {
  id                String   @id @default(cuid())
  proposalId        String   @unique
  templateId        String?
  lineItems         Json     // Array of budget line items
  totalDirectCosts  Decimal  @db.Decimal(12, 2)
  indirectCosts     Decimal  @db.Decimal(12, 2)
  indirectRate      Decimal  @db.Decimal(5, 4) // e.g., 0.1000 for 10%
  totalCosts        Decimal  @db.Decimal(12, 2)
  costSharing       Decimal? @db.Decimal(12, 2)
  narrative         String?  @db.Text
  exportedFiles     Json?    // {csv: "url", excel: "url", word: "url"}
  createdById       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  proposal          Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  template          BudgetTemplate? @relation(fields: [templateId], references: [id])
  createdBy         User     @relation(fields: [createdById], references: [id])

  @@index([proposalId])
  @@index([createdById])
}

model BudgetTemplate {
  id                String   @id @default(cuid())
  organizationId    String?
  name              String
  description       String?
  category          String   // federal, foundation, corporate, government
  isPublic          Boolean  @default(false)
  lineItems         Json     // Template structure
  totalAmount       Decimal? @db.Decimal(12, 2)
  metadata          Json?    // Additional template data
  createdById       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy         User          @relation(fields: [createdById], references: [id])
  budgets           ProposalBudget[]

  @@index([organizationId])
  @@index([category])
}

model OrganizationFinancials {
  id                String   @id @default(cuid())
  organizationId    String
  fiscalYear        Int
  totalRevenue      Decimal  @db.Decimal(12, 2)
  totalExpenses     Decimal  @db.Decimal(12, 2)
  personnelCosts    Decimal? @db.Decimal(12, 2)
  fringeBenefitRate Decimal? @db.Decimal(5, 4) // e.g., 0.2500 for 25%
  indirectCostRate  Decimal? @db.Decimal(5, 4) // e.g., 0.1500 for 15%
  hasNICRA          Boolean  @default(false) // Negotiated Indirect Cost Rate Agreement
  nicraUrl          String?  // Link to NICRA document
  form990Url        String?
  auditUrl          String?
  metadata          Json?
  createdById       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy         User         @relation(fields: [createdById], references: [id])

  @@unique([organizationId, fiscalYear])
  @@index([organizationId])
}

model NonProfitBudgetStandard {
  id                String   @id @default(cuid())
  category          String   // personnel, fringe, travel, equipment, supplies, etc.
  itemType          String   // salary_range, benefit_rate, mileage_rate, etc.
  region            String?  // US, Northeast, California, etc.
  standard          Json     // Standard values/ranges
  source            String   // OMB, IRS, GSA, State, Industry
  effectiveDate     DateTime
  expirationDate    DateTime?
  description       String?
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([category])
  @@index([itemType])
  @@index([effectiveDate])
}

// Add relations to existing models

model Proposal {
  // ... existing fields ...
  budget            ProposalBudget?
}

model Organization {
  // ... existing fields ...
  budgetTemplates   BudgetTemplate[]
  financials        OrganizationFinancials[]
}

model User {
  // ... existing fields ...
  budgets           ProposalBudget[]
  budgetTemplates   BudgetTemplate[]
  financials        OrganizationFinancials[]
}
```

**Migration Commands**:
```bash
cd packages/backend/server
npx prisma format
npx prisma migrate dev --name add_budget_tables
npx prisma generate
```

**Testing**:
```bash
# Verify migration
npx prisma migrate status

# Test with Prisma Studio
npx prisma studio
```

#### Task 1.2: Seed Non-Profit Standards Data ⏱️ 1 day

**File**: `packages/backend/server/prisma/budget-standards-seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBudgetStandards() {
  console.log('Seeding non-profit budget standards...');

  // OMB Standard Mileage Rate (Updated annually)
  await prisma.nonProfitBudgetStandard.create({
    data: {
      category: 'travel',
      itemType: 'mileage_rate',
      region: 'US',
      standard: { rate: 0.67, unit: 'per_mile', year: 2024 },
      source: 'IRS',
      effectiveDate: new Date('2024-01-01'),
      description: 'Standard mileage rate for business use of vehicle',
    },
  });

  // Federal Per Diem Rates
  await prisma.nonProfitBudgetStandard.create({
    data: {
      category: 'travel',
      itemType: 'per_diem_rate',
      region: 'US_Standard',
      standard: { meals: 59, lodging: 98, total: 157, year: 2024 },
      source: 'GSA',
      effectiveDate: new Date('2024-10-01'),
      description: 'Standard CONUS per diem rates',
    },
  });

  // Typical Fringe Benefit Rates (Non-Profit)
  await prisma.nonProfitBudgetStandard.create({
    data: {
      category: 'fringe',
      itemType: 'benefit_rate',
      region: 'US',
      standard: {
        low: 0.20,
        average: 0.30,
        high: 0.40,
        components: [
          'Health insurance',
          'Retirement (403b)',
          'Payroll taxes (FICA)',
          'Workers compensation',
          'Unemployment insurance',
          'Life/disability insurance',
        ],
      },
      source: 'Industry',
      effectiveDate: new Date('2024-01-01'),
      description: 'Typical fringe benefit rates for non-profit organizations',
    },
  });

  // OMB De Minimis Indirect Cost Rate
  await prisma.nonProfitBudgetStandard.create({
    data: {
      category: 'indirect',
      itemType: 'de_minimis_rate',
      region: 'US',
      standard: {
        rate: 0.10,
        base: 'Modified Total Direct Costs (MTDC)',
        eligibility: 'Organizations without NICRA',
      },
      source: 'OMB 2 CFR 200.414',
      effectiveDate: new Date('2014-12-26'),
      description: 'De minimis indirect cost rate for federal grants',
    },
  });

  // Equipment Threshold
  await prisma.nonProfitBudgetStandard.create({
    data: {
      category: 'equipment',
      itemType: 'capitalization_threshold',
      region: 'US',
      standard: { threshold: 5000, unit: 'dollars', useful_life_years: 1 },
      source: 'OMB 2 CFR 200.33',
      effectiveDate: new Date('2014-12-26'),
      description: 'Equipment vs supplies threshold for federal grants',
    },
  });

  // Typical Salary Ranges (Non-Profit)
  await prisma.nonProfitBudgetStandard.create({
    data: {
      category: 'personnel',
      itemType: 'salary_range',
      region: 'US',
      standard: {
        executive_director: { low: 60000, median: 85000, high: 120000 },
        program_director: { low: 50000, median: 65000, high: 85000 },
        program_manager: { low: 45000, median: 55000, high: 70000 },
        program_coordinator: { low: 35000, median: 45000, high: 55000 },
        administrative_assistant: { low: 30000, median: 40000, high: 50000 },
      },
      source: 'Nonprofit HR',
      effectiveDate: new Date('2024-01-01'),
      description: 'Typical salary ranges for non-profit positions',
    },
  });

  console.log('Budget standards seeded successfully!');
}

seedBudgetStandards()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run Seed**:
```bash
npx ts-node prisma/budget-standards-seed.ts
```

#### Task 1.3: Create Budget Service ⏱️ 1 day

**File**: `packages/backend/server/src/modules/budget/budget.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Decimal from 'decimal.js';

export interface BudgetLineItem {
  id?: string;
  category: string; // Personnel, Fringe, Travel, Equipment, Supplies, Contractual, Other
  item: string;
  description: string;
  calculation: string;
  quantity: number;
  unitCost: number;
  total: number;
  justification: string;
  metadata?: any;
}

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get budget for proposal
   */
  async getBudgetByProposal(proposalId: string) {
    return this.prisma.proposalBudget.findUnique({
      where: { proposalId },
      include: {
        template: true,
        proposal: {
          include: {
            workspace: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create budget
   */
  async createBudget(data: {
    proposalId: string;
    userId: string;
    lineItems: BudgetLineItem[];
    indirectRate?: number;
    narrative?: string;
  }) {
    const { proposalId, userId, lineItems, indirectRate, narrative } = data;

    // Calculate totals
    const totalDirectCosts = lineItems.reduce((sum, item) => sum + item.total, 0);
    const rate = indirectRate || 0.1; // Default to 10% de minimis
    const indirectCosts = totalDirectCosts * rate;
    const totalCosts = totalDirectCosts + indirectCosts;

    return this.prisma.proposalBudget.create({
      data: {
        proposalId,
        createdById: userId,
        lineItems: lineItems as any,
        totalDirectCosts: new Decimal(totalDirectCosts),
        indirectCosts: new Decimal(indirectCosts),
        indirectRate: new Decimal(rate),
        totalCosts: new Decimal(totalCosts),
        narrative,
      },
    });
  }

  /**
   * Update budget
   */
  async updateBudget(budgetId: string, data: {
    lineItems?: BudgetLineItem[];
    indirectRate?: number;
    costSharing?: number;
    narrative?: string;
  }) {
    const { lineItems, indirectRate, costSharing, narrative } = data;

    let updateData: any = {};

    if (lineItems) {
      const totalDirectCosts = lineItems.reduce((sum, item) => sum + item.total, 0);
      const rate = indirectRate || 0.1;
      const indirectCosts = totalDirectCosts * rate;
      const totalCosts = totalDirectCosts + indirectCosts;

      updateData = {
        lineItems: lineItems as any,
        totalDirectCosts: new Decimal(totalDirectCosts),
        indirectCosts: new Decimal(indirectCosts),
        indirectRate: new Decimal(rate),
        totalCosts: new Decimal(totalCosts),
      };
    }

    if (indirectRate !== undefined) {
      updateData.indirectRate = new Decimal(indirectRate);
    }

    if (costSharing !== undefined) {
      updateData.costSharing = new Decimal(costSharing);
    }

    if (narrative !== undefined) {
      updateData.narrative = narrative;
    }

    return this.prisma.proposalBudget.update({
      where: { id: budgetId },
      data: updateData,
    });
  }

  /**
   * Get organization financials
   */
  async getOrganizationFinancials(organizationId: string, fiscalYear?: number) {
    if (fiscalYear) {
      return this.prisma.organizationFinancials.findUnique({
        where: {
          organizationId_fiscalYear: {
            organizationId,
            fiscalYear,
          },
        },
      });
    }

    // Get most recent fiscal year
    return this.prisma.organizationFinancials.findFirst({
      where: { organizationId },
      orderBy: { fiscalYear: 'desc' },
    });
  }

  /**
   * Get budget templates
   */
  async getBudgetTemplates(filter?: {
    category?: string;
    organizationId?: string;
    isPublic?: boolean;
  }) {
    return this.prisma.budgetTemplate.findMany({
      where: {
        category: filter?.category,
        organizationId: filter?.organizationId,
        isPublic: filter?.isPublic,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get non-profit standards
   */
  async getNonProfitStandards(filter?: {
    category?: string;
    itemType?: string;
    region?: string;
  }) {
    const where: any = {};

    if (filter?.category) where.category = filter.category;
    if (filter?.itemType) where.itemType = filter.itemType;
    if (filter?.region) where.region = filter.region;

    // Get current standards (effective date <= now, no expiration or expiration >= now)
    const now = new Date();
    where.effectiveDate = { lte: now };
    where.OR = [
      { expirationDate: null },
      { expirationDate: { gte: now } },
    ];

    return this.prisma.nonProfitBudgetStandard.findMany({
      where,
      orderBy: { effectiveDate: 'desc' },
    });
  }

  /**
   * Calculate indirect costs
   */
  async calculateIndirectCosts(
    directCosts: number,
    organizationId: string,
    useDeMinimis: boolean = false
  ) {
    if (useDeMinimis) {
      return {
        rate: 0.1,
        amount: directCosts * 0.1,
        source: 'OMB 2 CFR 200.414 (De Minimis)',
      };
    }

    // Get organization's negotiated rate
    const financials = await this.getOrganizationFinancials(organizationId);

    if (financials?.indirectCostRate) {
      const rate = Number(financials.indirectCostRate);
      return {
        rate,
        amount: directCosts * rate,
        source: financials.hasNICRA ? 'Negotiated Indirect Cost Rate Agreement (NICRA)' : 'Organization Rate',
      };
    }

    // Default to de minimis if no rate found
    return {
      rate: 0.1,
      amount: directCosts * 0.1,
      source: 'OMB 2 CFR 200.414 (De Minimis - Default)',
    };
  }
}
```

---

### Phase 2: Budget Agent & Tools (Days 5-9)

#### Task 2.1: Implement Budget Tools ⏱️ 3 days

**File**: `packages/backend/server/src/modules/ai/tools/budget-tools.ts`

```typescript
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from '../services/embedding.service';

export class BudgetTools {
  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService
  ) {}

  /**
   * Tool 1: Get Organization Financials
   */
  async getOrganizationFinancials(args: {
    organization_id: string;
    fiscal_year?: number;
  }) {
    const financials = args.fiscal_year
      ? await this.prisma.organizationFinancials.findUnique({
          where: {
            organizationId_fiscalYear: {
              organizationId: args.organization_id,
              fiscalYear: args.fiscal_year,
            },
          },
        })
      : await this.prisma.organizationFinancials.findFirst({
          where: { organizationId: args.organization_id },
          orderBy: { fiscalYear: 'desc' },
        });

    if (!financials) {
      return {
        error: 'No financial data found',
        suggestion: 'Use semantic search to find salary and benefit information from documents',
      };
    }

    // Also search for salary schedules in documents
    const salaryDocs = await this.embeddingService.semanticSearch(
      args.organization_id,
      'salary schedule pay scale compensation rates staff positions',
      3
    );

    return {
      financials: {
        fiscalYear: financials.fiscalYear,
        totalRevenue: Number(financials.totalRevenue),
        totalExpenses: Number(financials.totalExpenses),
        personnelCosts: Number(financials.personnelCosts),
        fringeBenefitRate: Number(financials.fringeBenefitRate),
        indirectCostRate: Number(financials.indirectCostRate),
        hasNICRA: financials.hasNICRA,
      },
      salaryDocuments: salaryDocs.map(doc => ({
        title: doc.documentTitle,
        excerpt: doc.chunkText,
        similarity: doc.similarity,
      })),
    };
  }

  /**
   * Tool 2: Search Budget Templates
   */
  async searchBudgetTemplates(args: {
    category?: 'federal' | 'foundation' | 'corporate';
    organization_id?: string;
  }) {
    const templates = await this.prisma.budgetTemplate.findMany({
      where: {
        category: args.category,
        OR: [
          { organizationId: args.organization_id },
          { isPublic: true },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        lineItems: true,
        totalAmount: true,
      },
      take: 10,
    });

    return templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      totalAmount: Number(t.totalAmount),
      lineItemCount: Array.isArray(t.lineItems) ? (t.lineItems as any[]).length : 0,
    }));
  }

  /**
   * Tool 3: Get Non-Profit Standards
   */
  async getNonProfitStandards(args: {
    category?: string;
    item_type?: string;
    region?: string;
  }) {
    const standards = await this.prisma.nonProfitBudgetStandard.findMany({
      where: {
        category: args.category,
        itemType: args.item_type,
        region: args.region,
        effectiveDate: { lte: new Date() },
        OR: [
          { expirationDate: null },
          { expirationDate: { gte: new Date() } },
        ],
      },
      orderBy: { effectiveDate: 'desc' },
      take: 10,
    });

    return standards.map(s => ({
      category: s.category,
      itemType: s.itemType,
      region: s.region,
      standard: s.standard,
      source: s.source,
      description: s.description,
    }));
  }

  /**
   * Tool 4: Calculate Indirect Costs
   */
  async calculateIndirectCosts(args: {
    direct_costs: number;
    organization_id: string;
    use_de_minimis?: boolean;
  }) {
    const useDeMinimis = args.use_de_minimis || false;

    if (useDeMinimis) {
      return {
        rate: 0.1,
        ratePercent: '10%',
        amount: args.direct_costs * 0.1,
        total: args.direct_costs + (args.direct_costs * 0.1),
        source: 'OMB 2 CFR 200.414 (10% De Minimis)',
        explanation: 'Organizations without a negotiated rate may use 10% de minimis rate on MTDC',
      };
    }

    const financials = await this.prisma.organizationFinancials.findFirst({
      where: { organizationId: args.organization_id },
      orderBy: { fiscalYear: 'desc' },
    });

    if (financials?.indirectCostRate) {
      const rate = Number(financials.indirectCostRate);
      return {
        rate,
        ratePercent: `${(rate * 100).toFixed(1)}%`,
        amount: args.direct_costs * rate,
        total: args.direct_costs + (args.direct_costs * rate),
        source: financials.hasNICRA
          ? 'Negotiated Indirect Cost Rate Agreement (NICRA)'
          : 'Organization Historical Rate',
        explanation: financials.hasNICRA
          ? 'Organization has a federally negotiated indirect cost rate'
          : 'Based on organization\'s historical indirect cost rate',
      };
    }

    // Default to de minimis
    return {
      rate: 0.1,
      ratePercent: '10%',
      amount: args.direct_costs * 0.1,
      total: args.direct_costs + (args.direct_costs * 0.1),
      source: 'OMB 2 CFR 200.414 (10% De Minimis - Default)',
      explanation: 'No negotiated rate found, using de minimis rate',
    };
  }

  /**
   * Tool 5: Search Past Budgets (via RAG)
   */
  async searchPastBudgets(args: {
    organization_id: string;
    project_description: string;
    limit?: number;
  }) {
    // Search for similar past budgets in documents
    const query = `grant budget proposal ${args.project_description} personnel costs expenses line items`;

    const results = await this.embeddingService.semanticSearch(
      args.organization_id,
      query,
      args.limit || 5
    );

    return results.map(r => ({
      documentTitle: r.documentTitle,
      excerpt: r.chunkText,
      similarity: r.similarity,
    }));
  }

  /**
   * Tool 6: Get Fringe Benefit Components
   */
  async getFringeBenefitComponents(args: {
    organization_id: string;
  }) {
    // Get from financials
    const financials = await this.prisma.organizationFinancials.findFirst({
      where: { organizationId: args.organization_id },
      orderBy: { fiscalYear: 'desc' },
    });

    // Also search documents
    const docs = await this.embeddingService.semanticSearch(
      args.organization_id,
      'fringe benefits employee benefits health insurance retirement FICA payroll taxes workers compensation',
      3
    );

    // Get standard fringe components
    const standards = await this.prisma.nonProfitBudgetStandard.findFirst({
      where: {
        category: 'fringe',
        itemType: 'benefit_rate',
      },
    });

    return {
      organizationRate: financials?.fringeBenefitRate
        ? Number(financials.fringeBenefitRate)
        : null,
      standardComponents: standards?.standard || {},
      documents: docs.map(d => ({
        title: d.documentTitle,
        excerpt: d.chunkText,
      })),
    };
  }
}

// Tool definitions for Claude
export const budgetToolDefinitions = [
  {
    name: 'get_organization_financials',
    description: 'Retrieve organization financial data including salaries, fringe benefit rates, and indirect cost rates. Use this to get actual organizational costs for budget accuracy.',
    input_schema: {
      type: 'object',
      properties: {
        organization_id: {
          type: 'string',
          description: 'Organization ID',
        },
        fiscal_year: {
          type: 'number',
          description: 'Specific fiscal year (optional, defaults to most recent)',
        },
      },
      required: ['organization_id'],
    },
  },
  {
    name: 'search_budget_templates',
    description: 'Search for budget templates by category (federal, foundation, corporate). Returns pre-built budget structures.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['federal', 'foundation', 'corporate'],
          description: 'Type of budget template',
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
    description: 'Get non-profit budget standards and best practices including OMB rates, typical costs, and compliance requirements.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Budget category: personnel, fringe, travel, equipment, supplies, indirect',
        },
        item_type: {
          type: 'string',
          description: 'Specific item type: salary_range, benefit_rate, mileage_rate, etc.',
        },
        region: {
          type: 'string',
          description: 'Geographic region (optional)',
        },
      },
    },
  },
  {
    name: 'calculate_indirect_costs',
    description: 'Calculate indirect costs (overhead) using organization\'s negotiated rate or 10% de minimis rate.',
    input_schema: {
      type: 'object',
      properties: {
        direct_costs: {
          type: 'number',
          description: 'Total direct costs amount',
        },
        organization_id: {
          type: 'string',
          description: 'Organization ID to get their rate',
        },
        use_de_minimis: {
          type: 'boolean',
          description: 'Force use of 10% de minimis rate instead of org rate',
        },
      },
      required: ['direct_costs', 'organization_id'],
    },
  },
  {
    name: 'search_past_budgets',
    description: 'Search organization documents for similar past budgets to use as reference.',
    input_schema: {
      type: 'object',
      properties: {
        organization_id: {
          type: 'string',
          description: 'Organization ID',
        },
        project_description: {
          type: 'string',
          description: 'Description of current project to find similar budgets',
        },
        limit: {
          type: 'number',
          description: 'Number of results (default 5)',
        },
      },
      required: ['organization_id', 'project_description'],
    },
  },
  {
    name: 'get_fringe_benefit_components',
    description: 'Get detailed fringe benefit components and rates for the organization.',
    input_schema: {
      type: 'object',
      properties: {
        organization_id: {
          type: 'string',
          description: 'Organization ID',
        },
      },
      required: ['organization_id'],
    },
  },
];
```

#### Task 2.2: Create Budget Agent ⏱️ 4 days

**File**: `packages/backend/server/src/modules/ai/agents/budget-agent.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { BudgetTools, budgetToolDefinitions } from '../tools/budget-tools';
import { EmbeddingService } from '../services/embedding.service';

interface BudgetGenerationInput {
  proposalId: string;
  organizationId: string;
  requestedAmount?: number;
  periodMonths: number;
  projectDescription: string;
  grantRequirements?: string;
  userGuidance?: string;
}

@Injectable()
export class BudgetAgentService {
  private anthropic: Anthropic;
  private budgetTools: BudgetTools;

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.budgetTools = new BudgetTools(prisma, embeddingService);
  }

  async generateBudget(input: BudgetGenerationInput) {
    const systemPrompt = `You are an expert non-profit budget specialist with deep knowledge of:
- OMB Uniform Guidance (2 CFR 200) for federal grants
- Foundation and corporate grant budgeting
- Non-profit accounting standards
- Budget narratives and justifications

Your role is to create accurate, compliant, and well-justified budgets that:
1. Use the organization's actual financial data (salaries, fringe rates, indirect rates)
2. Follow funder requirements exactly
3. Comply with non-profit accounting standards
4. Include detailed justifications for each line item
5. Ensure costs are necessary, reasonable, and allocable

Use the available tools to:
- Get organization financial data
- Retrieve non-profit standards
- Calculate indirect costs correctly
- Reference past budgets for consistency

Be precise with calculations and always show your work in the calculation field.`;

    const userPrompt = `Create a comprehensive grant proposal budget.

PROJECT INFORMATION:
- Organization ID: ${input.organizationId}
- Project: ${input.projectDescription}
- Period: ${input.periodMonths} months
- Requested Amount: ${input.requestedAmount ? `$${input.requestedAmount.toLocaleString()}` : 'Not specified'}

GRANT REQUIREMENTS:
${input.grantRequirements || 'Follow standard non-profit budget best practices'}

USER GUIDANCE:
${input.userGuidance || 'None'}

INSTRUCTIONS:
1. First, use tools to gather context:
   - get_organization_financials: Get salary and benefit data
   - get_nonprofit_standards: Get standard rates (mileage, per diem, etc.)
   - search_past_budgets: Find similar past budgets
   - get_fringe_benefit_components: Get detailed fringe info

2. Create a detailed budget with these categories:
   A. Personnel (staff positions with FTE, salary, period)
   B. Fringe Benefits (use org's actual rate)
   C. Travel (if needed - conferences, site visits)
   D. Equipment (items >$5,000)
   E. Supplies (items <$5,000)
   F. Contractual (consultants, contractors)
   G. Other Direct Costs (rent, utilities, etc.)

3. Calculate indirect costs:
   - Use calculate_indirect_costs tool
   - Apply org's negotiated rate or 10% de minimis

4. For each line item provide:
   - Clear description
   - Detailed calculation (show your work!)
   - Strong justification (why necessary and reasonable)

5. Return JSON in this exact format:
{
  "budget_summary": {
    "total_direct_costs": 0,
    "indirect_costs": 0,
    "indirect_rate": 0,
    "total_costs": 0,
    "cost_sharing": 0
  },
  "line_items": [
    {
      "category": "Personnel",
      "item": "Project Director",
      "description": "Lead project implementation and management",
      "calculation": "1 FTE x $65,000 annual x 12 months = $65,000",
      "quantity": 1,
      "unit_cost": 65000,
      "total": 65000,
      "justification": "Project Director needed full-time to manage implementation..."
    }
  ],
  "budget_narrative": "Overall budget justification...",
  "sources_used": ["Tool calls made", "Data sources referenced"]
}

Be thorough and create a complete, realistic budget based on the organization's actual costs.`;

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    let response: Anthropic.Message;
    let continueLoop = true;
    let iterations = 0;
    const maxIterations = 10;

    // Agentic loop with tool use
    while (continueLoop && iterations < maxIterations) {
      iterations++;

      response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 16000,
        temperature: 0.3,
        system: systemPrompt,
        tools: budgetToolDefinitions as any,
        messages,
      });

      // Check if Claude wants to use tools
      const toolUseBlocks = response.content.filter(
        (block) => block.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        // No more tool use, we have final answer
        continueLoop = false;
        break;
      }

      // Execute tools
      const toolResults: Anthropic.MessageParam = {
        role: 'user',
        content: [],
      };

      for (const toolBlock of toolUseBlocks) {
        if (toolBlock.type !== 'tool_use') continue;

        let result: any;

        try {
          switch (toolBlock.name) {
            case 'get_organization_financials':
              result = await this.budgetTools.getOrganizationFinancials(toolBlock.input as any);
              break;
            case 'search_budget_templates':
              result = await this.budgetTools.searchBudgetTemplates(toolBlock.input as any);
              break;
            case 'get_nonprofit_standards':
              result = await this.budgetTools.getNonProfitStandards(toolBlock.input as any);
              break;
            case 'calculate_indirect_costs':
              result = await this.budgetTools.calculateIndirectCosts(toolBlock.input as any);
              break;
            case 'search_past_budgets':
              result = await this.budgetTools.searchPastBudgets(toolBlock.input as any);
              break;
            case 'get_fringe_benefit_components':
              result = await this.budgetTools.getFringeBenefitComponents(toolBlock.input as any);
              break;
            default:
              result = { error: `Unknown tool: ${toolBlock.name}` };
          }
        } catch (error) {
          result = { error: error.message };
        }

        (toolResults.content as any[]).push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result),
        });
      }

      // Add assistant response and tool results to conversation
      messages.push({
        role: 'assistant',
        content: response.content,
      });
      messages.push(toolResults);
    }

    // Parse final budget from response
    const finalText = response!.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    const jsonMatch = finalText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse budget from AI response');
    }

    const budgetData = JSON.parse(jsonMatch[0]);

    // Save to database
    const budget = await this.prisma.proposalBudget.create({
      data: {
        proposalId: input.proposalId,
        createdById: 'system', // TODO: Get from context
        lineItems: budgetData.line_items,
        totalDirectCosts: budgetData.budget_summary.total_direct_costs,
        indirectCosts: budgetData.budget_summary.indirect_costs,
        indirectRate: budgetData.budget_summary.indirect_rate,
        totalCosts: budgetData.budget_summary.total_costs,
        costSharing: budgetData.budget_summary.cost_sharing || 0,
        narrative: budgetData.budget_narrative,
      },
    });

    return {
      budget,
      toolsUsed: budgetData.sources_used || [],
      iterations,
    };
  }
}
```

---

### Phase 3: Export Service (Days 10-12)

#### Task 3.1: CSV/Excel Export Service ⏱️ 3 days

**File**: `packages/backend/server/src/modules/budget/budget-export.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Parser } from '@json2csv/plainjs';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetExportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Export budget to CSV
   */
  async exportToCSV(budgetId: string): Promise<Buffer> {
    const budget = await this.prisma.proposalBudget.findUnique({
      where: { id: budgetId },
      include: { proposal: true },
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    const lineItems = budget.lineItems as any[];

    const fields = [
      { label: 'Category', value: 'category' },
      { label: 'Item', value: 'item' },
      { label: 'Description', value: 'description' },
      { label: 'Calculation', value: 'calculation' },
      { label: 'Quantity', value: 'quantity' },
      { label: 'Unit Cost', value: 'unitCost' },
      { label: 'Total', value: 'total' },
      { label: 'Justification', value: 'justification' },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(lineItems);

    // Add summary
    const summary = `\n\nBUDGET SUMMARY\nTotal Direct Costs,$${Number(budget.totalDirectCosts).toFixed(2)}\nIndirect Costs (${(Number(budget.indirectRate) * 100).toFixed(1)}%),$${Number(budget.indirectCosts).toFixed(2)}\nTotal Budget,$${Number(budget.totalCosts).toFixed(2)}`;

    return Buffer.from(csv + summary);
  }

  /**
   * Export budget to Excel with formatting
   */
  async exportToExcel(budgetId: string): Promise<Buffer> {
    const budget = await this.prisma.proposalBudget.findUnique({
      where: { id: budgetId },
      include: { proposal: true },
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    const lineItems = budget.lineItems as any[];
    const workbook = new ExcelJS.Workbook();

    // Budget worksheet
    const budgetSheet = workbook.addWorksheet('Budget');

    // Title
    budgetSheet.mergeCells('A1:G1');
    budgetSheet.getCell('A1').value = `Budget for: ${budget.proposal.title}`;
    budgetSheet.getCell('A1').font = { size: 16, bold: true };
    budgetSheet.getCell('A1').alignment = { horizontal: 'center' };
    budgetSheet.addRow([]);

    // Headers
    const headerRow = budgetSheet.addRow([
      'Category',
      'Item',
      'Description',
      'Quantity',
      'Unit Cost',
      'Total',
      'Justification',
    ]);

    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Column widths
    budgetSheet.columns = [
      { width: 20 },
      { width: 30 },
      { width: 40 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 50 },
    ];

    // Add line items grouped by category
    const categories = ['Personnel', 'Fringe', 'Travel', 'Equipment', 'Supplies', 'Contractual', 'Other'];

    categories.forEach(category => {
      const categoryItems = lineItems.filter(item => item.category === category);

      if (categoryItems.length > 0) {
        // Category header
        const catRow = budgetSheet.addRow([category.toUpperCase()]);
        catRow.font = { bold: true };
        catRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' },
        };

        // Items in category
        categoryItems.forEach(item => {
          budgetSheet.addRow([
            '',
            item.item,
            item.description,
            item.quantity,
            item.unitCost,
            item.total,
            item.justification,
          ]);
        });

        // Category subtotal
        const categoryTotal = categoryItems.reduce((sum, item) => sum + item.total, 0);
        const subtotalRow = budgetSheet.addRow([
          '',
          `${category} Subtotal`,
          '',
          '',
          '',
          categoryTotal,
          '',
        ]);
        subtotalRow.font = { bold: true };
        budgetSheet.addRow([]); // Blank row
      }
    });

    // Summary
    budgetSheet.addRow(['BUDGET SUMMARY']).font = { bold: true, size: 14 };
    budgetSheet.addRow([]);

    budgetSheet.addRow(['Total Direct Costs', '', '', '', '', Number(budget.totalDirectCosts)]).font = { bold: true };
    budgetSheet.addRow([
      `Indirect Costs (${(Number(budget.indirectRate) * 100).toFixed(1)}%)`,
      '',
      '',
      '',
      '',
      Number(budget.indirectCosts),
    ]);
    budgetSheet.addRow([]);

    const totalRow = budgetSheet.addRow(['TOTAL BUDGET', '', '', '', '', Number(budget.totalCosts)]);
    totalRow.font = { bold: true, size: 14 };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' },
    };

    // Number formatting
    budgetSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3) {
        row.getCell(5).numFmt = '$#,##0.00';
        row.getCell(6).numFmt = '$#,##0.00';
      }
    });

    // Narrative worksheet
    if (budget.narrative) {
      const narrativeSheet = workbook.addWorksheet('Budget Narrative');
      narrativeSheet.getCell('A1').value = 'BUDGET NARRATIVE';
      narrativeSheet.getCell('A1').font = { size: 16, bold: true };
      narrativeSheet.addRow([]);

      const narrativeCell = narrativeSheet.getCell('A3');
      narrativeCell.value = budget.narrative;
      narrativeCell.alignment = { wrapText: true, vertical: 'top' };

      narrativeSheet.getColumn(1).width = 100;
    }

    // Generate buffer
    return await workbook.xlsx.writeBuffer() as Buffer;
  }
}
```

**Install Dependencies**:
```bash
cd packages/backend/server
npm install @json2csv/plainjs exceljs
npm install -D @types/node
```

---

### Phase 4: Frontend (Days 13-18)

#### Task 4.1: Budget Builder UI ⏱️ 5 days

**File**: `packages/frontend/app/src/pages/proposals/budget-builder.tsx`

```typescript
import {
  Button,
  IconButton,
  Input,
  Loading,
  ScrollableContainer,
  Select,
  toast,
} from '@afk/component';
import {
  AddIcon,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  SaveIcon,
} from '@blocksuite/icons/rc';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { cn } from '@/lib/utils';
import { gql } from '@/lib/gql';

import { AutoSidebarPadding } from '../layout/auto-sidebar-padding';

interface BudgetLineItem {
  id?: string;
  category: string;
  item: string;
  description: string;
  calculation: string;
  quantity: number;
  unitCost: number;
  total: number;
  justification: string;
}

const categories = [
  'Personnel',
  'Fringe',
  'Travel',
  'Equipment',
  'Supplies',
  'Contractual',
  'Other',
];

export const BudgetBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);
  const [narrative, setNarrative] = useState('');
  const [indirectRate, setIndirectRate] = useState(0.1);

  useEffect(() => {
    loadBudget();
  }, [id]);

  const loadBudget = async () => {
    setLoading(true);
    try {
      const res = await gql({
        query: `
          query GetProposalBudget($proposalId: ID!) {
            proposalBudget(proposalId: $proposalId) {
              id
              lineItems
              totalDirectCosts
              indirectCosts
              indirectRate
              totalCosts
              narrative
            }
          }
        `,
        variables: { proposalId: id },
      });

      if (res.data?.proposalBudget) {
        setBudget(res.data.proposalBudget);
        setLineItems(res.data.proposalBudget.lineItems || []);
        setNarrative(res.data.proposalBudget.narrative || '');
        setIndirectRate(res.data.proposalBudget.indirectRate || 0.1);
      }
    } catch (error) {
      console.error('Failed to load budget:', error);
    } finally {
      setLoading(false);
    }
  };

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

      if (res.data?.generateBudget) {
        setBudget(res.data.generateBudget);
        setLineItems(res.data.generateBudget.lineItems || []);
        setNarrative(res.data.generateBudget.narrative || '');
        toast.success('Budget generated successfully!');
      }
    } catch (error) {
      console.error('Failed to generate budget:', error);
      toast.error('Failed to generate budget');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveBudget = async () => {
    setSaving(true);
    try {
      await gql({
        query: `
          mutation UpdateBudget($budgetId: ID!, $input: UpdateBudgetInput!) {
            updateBudget(budgetId: $budgetId, input: $input) {
              id
            }
          }
        `,
        variables: {
          budgetId: budget.id,
          input: {
            lineItems,
            narrative,
            indirectRate,
          },
        },
      });

      toast.success('Budget saved');
      loadBudget();
    } catch (error) {
      toast.error('Failed to save budget');
    } finally {
      setSaving(false);
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

      if (res.data?.exportBudget?.fileUrl) {
        window.open(res.data.exportBudget.fileUrl, '_blank');
        toast.success(`Budget exported as ${format.toUpperCase()}`);
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        category: 'Personnel',
        item: '',
        description: '',
        calculation: '',
        quantity: 1,
        unitCost: 0,
        total: 0,
        justification: '',
      },
    ]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate total if quantity or unit cost changed
    if (field === 'quantity' || field === 'unitCost') {
      updated[index].total = updated[index].quantity * updated[index].unitCost;
    }

    setLineItems(updated);
  };

  const deleteLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const totalDirect = lineItems.reduce((sum, item) => sum + item.total, 0);
    const indirect = totalDirect * indirectRate;
    const total = totalDirect + indirect;

    return { totalDirect, indirect, total };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loading className="text-2xl" />
      </div>
    );
  }

  return (
    <AutoSidebarPadding className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Budget Builder</h1>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage your proposal budget
            </p>
          </div>
          <div className="flex gap-2">
            {!budget && (
              <Button
                onClick={handleGenerateBudget}
                loading={generating}
              >
                Generate with AI
              </Button>
            )}
            {budget && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => handleExport('csv')}
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleExport('excel')}
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
                <Button
                  onClick={handleSaveBudget}
                  loading={saving}
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save Budget
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollableContainer className="flex-1 p-6">
        {/* Budget Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Direct Costs</p>
            <p className="text-2xl font-bold mt-1">
              ${totals.totalDirect.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Indirect Costs ({(indirectRate * 100).toFixed(1)}%)
            </p>
            <p className="text-2xl font-bold mt-1">
              ${totals.indirect.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white border border-blue-500 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Budget</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">
              ${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold">Budget Line Items</h2>
            <Button size="small" onClick={addLineItem}>
              <AddIcon className="w-4 h-4 mr-2" />
              Add Line Item
            </Button>
          </div>

          {categories.map(category => {
            const categoryItems = lineItems.filter(item => item.category === category);
            if (categoryItems.length === 0) return null;

            const categoryTotal = categoryItems.reduce((sum, item) => sum + item.total, 0);

            return (
              <div key={category} className="border-b border-gray-200">
                <div className="bg-gray-50 px-4 py-2 font-semibold flex items-center justify-between">
                  <span>{category}</span>
                  <span>${categoryTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                {categoryItems.map((item, idx) => {
                  const globalIdx = lineItems.findIndex(li => li === item);
                  return (
                    <div key={globalIdx} className="p-4 hover:bg-gray-50">
                      <div className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-3">
                          <label className="text-xs text-gray-500">Item</label>
                          <Input
                            value={item.item}
                            onChange={(e) => updateLineItem(globalIdx, 'item', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500">Quantity</label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(globalIdx, 'quantity', parseFloat(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500">Unit Cost</label>
                          <Input
                            type="number"
                            value={item.unitCost}
                            onChange={(e) => updateLineItem(globalIdx, 'unitCost', parseFloat(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500">Total</label>
                          <div className="mt-1 px-3 py-2 bg-gray-100 rounded font-semibold">
                            ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="col-span-3 flex items-end gap-2">
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => setEditingItem(editingItem === globalIdx ? null : globalIdx)}
                          >
                            <EditIcon className="w-4 h-4 mr-1" />
                            {editingItem === globalIdx ? 'Collapse' : 'Details'}
                          </Button>
                          <IconButton onClick={() => deleteLineItem(globalIdx)}>
                            <DeleteIcon className="w-4 h-4 text-red-600" />
                          </IconButton>
                        </div>
                      </div>

                      {editingItem === globalIdx && (
                        <div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
                          <div>
                            <label className="text-xs text-gray-500">Description</label>
                            <textarea
                              value={item.description}
                              onChange={(e) => updateLineItem(globalIdx, 'description', e.target.value)}
                              className="mt-1 w-full p-2 border border-gray-300 rounded"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Calculation</label>
                            <Input
                              value={item.calculation}
                              onChange={(e) => updateLineItem(globalIdx, 'calculation', e.target.value)}
                              placeholder="e.g., 1 FTE x $65,000 x 12 months"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Justification</label>
                            <textarea
                              value={item.justification}
                              onChange={(e) => updateLineItem(globalIdx, 'justification', e.target.value)}
                              className="mt-1 w-full p-2 border border-gray-300 rounded"
                              rows={3}
                              placeholder="Explain why this cost is necessary and reasonable..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Budget Narrative */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">Budget Narrative</h2>
          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded"
            rows={8}
            placeholder="Provide an overall budget justification explaining how costs support project activities..."
          />
        </div>
      </ScrollableContainer>
    </AutoSidebarPadding>
  );
};
```

---

## Testing Strategy

### Unit Tests
```typescript
// budget.service.spec.ts
describe('BudgetService', () => {
  it('should calculate indirect costs correctly');
  it('should retrieve organization financials');
  it('should create budget with line items');
});

// budget-agent.service.spec.ts
describe('BudgetAgentService', () => {
  it('should generate budget using tools');
  it('should use organization financial data');
  it('should apply non-profit standards');
});
```

### Integration Tests
```typescript
// budget.integration.spec.ts
describe('Budget Generation Integration', () => {
  it('should generate complete budget from proposal');
  it('should export budget to CSV');
  it('should export budget to Excel');
});
```

---

## Deployment Checklist

- [ ] Run database migrations
- [ ] Seed non-profit standards
- [ ] Test Budget Agent with real data
- [ ] Test all 6 budget tools
- [ ] Test CSV export
- [ ] Test Excel export
- [ ] Test UI budget builder
- [ ] Load test with multiple concurrent generations
- [ ] Document API for budget endpoints
- [ ] Create user guide for budget feature

---

## Success Criteria

✅ Budget generates in <5 minutes
✅ 90%+ accuracy on line items
✅ Indirect cost calculation correct
✅ CSV/Excel export functional
✅ UI allows inline editing
✅ RAG retrieves correct org data
✅ Complies with OMB standards

---

## Timeline Summary

| Phase | Tasks | Days | Dependencies |
|-------|-------|------|--------------|
| 1. Foundation | Database, Standards, Service | 4 | None |
| 2. Agent & Tools | Budget Agent, 6 Tools | 5 | Phase 1 |
| 3. Export | CSV/Excel Service | 3 | Phase 1 |
| 4. Frontend | Budget Builder UI | 5 | Phases 1-3 |
| 5. Testing | Integration & E2E | 3 | All |

**Total**: 18-20 working days (3.5-4 weeks)

---

This plan provides a complete roadmap to close all identified gaps in the budget generation feature! 🎯
