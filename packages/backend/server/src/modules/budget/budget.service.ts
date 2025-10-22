import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface BudgetLineItem {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  justification?: string;
  funderAllowable?: boolean;
}

export interface CreateBudgetInput {
  proposalId: string;
  lineItems?: BudgetLineItem[];
  indirectRate?: number;
  narrative?: string;
}

export interface UpdateBudgetInput {
  lineItems?: BudgetLineItem[];
  indirectRate?: number;
  narrative?: string;
  status?: string;
}

@Injectable()
export class BudgetService {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService
  ) {}

  /**
   * Create a new budget for a proposal
   */
  async create(userId: string, input: CreateBudgetInput) {
    // Check if proposal exists and user has access
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: input.proposalId },
      include: {
        workspace: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this proposal');
    }

    // Check if budget already exists
    const existingBudget = await this.prisma.proposalBudget.findUnique({
      where: { proposalId: input.proposalId },
    });

    if (existingBudget) {
      throw new BadRequestException('Budget already exists for this proposal');
    }

    // Calculate totals
    const lineItems = input.lineItems || [];
    const { totalDirectCosts, indirectCosts, totalCosts, indirectRate } =
      this.calculateTotals(lineItems, input.indirectRate);

    // Create budget
    const budget = await this.prisma.proposalBudget.create({
      data: {
        proposalId: input.proposalId,
        lineItems: lineItems,
        totalDirectCosts: new Decimal(totalDirectCosts),
        indirectCosts: new Decimal(indirectCosts),
        indirectRate: new Decimal(indirectRate),
        totalCosts: new Decimal(totalCosts),
        narrative: input.narrative || '',
        status: 'draft',
        createdBy: userId,
      },
    });

    return budget;
  }

  /**
   * Find budget by proposal ID
   */
  async findByProposalId(proposalId: string, userId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { workspace: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this proposal');
    }

    const budget = await this.prisma.proposalBudget.findUnique({
      where: { proposalId },
    });

    return budget;
  }

  /**
   * Update an existing budget
   */
  async update(budgetId: string, userId: string, input: UpdateBudgetInput) {
    const budget = await this.prisma.proposalBudget.findUnique({
      where: { id: budgetId },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // @ts-ignore - Prisma relation type issue
    const hasAccess = await this.workspaceService.checkAccess(budget.proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this budget');
    }

    // Calculate new totals if line items changed
    let updateData: any = {};

    if (input.lineItems) {
      const { totalDirectCosts, indirectCosts, totalCosts, indirectRate } =
        this.calculateTotals(input.lineItems, input.indirectRate);

      updateData = {
        lineItems: input.lineItems,
        totalDirectCosts: new Decimal(totalDirectCosts),
        indirectCosts: new Decimal(indirectCosts),
        indirectRate: new Decimal(indirectRate),
        totalCosts: new Decimal(totalCosts),
      };
    }

    if (input.narrative !== undefined) {
      updateData.narrative = input.narrative;
    }

    if (input.status) {
      updateData.status = input.status;
    }

    const updatedBudget = await this.prisma.proposalBudget.update({
      where: { id: budgetId },
      data: updateData,
    });

    return updatedBudget;
  }

  /**
   * Delete a budget
   */
  async delete(budgetId: string, userId: string) {
    const budget = await this.prisma.proposalBudget.findUnique({
      where: { id: budgetId },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // @ts-ignore - Prisma relation type issue
    const hasAccess = await this.workspaceService.checkAccess(budget.proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this budget');
    }

    await this.prisma.proposalBudget.delete({
      where: { id: budgetId },
    });

    return { success: true };
  }

  /**
   * Get organization financial data
   */
  async getOrganizationFinancials(organizationId: string) {
    const financials = await this.prisma.organizationFinancials.findUnique({
      where: { organizationId },
    });

    return financials;
  }

  /**
   * Get budget templates by category
   */
  async getTemplates(organizationId: string, category?: string) {
    const where: any = {
      OR: [
        { organizationId },
        { isPublic: true },
      ],
    };

    if (category) {
      where.category = category;
    }

    const templates = await this.prisma.budgetTemplate.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return templates;
  }

  /**
   * Get non-profit budget standards
   */
  async getBudgetStandards(standardType?: string, category?: string) {
    const where: any = {};

    if (standardType) {
      where.standardType = standardType;
    }

    if (category) {
      where.category = category;
    }

    const standards = await this.prisma.nonProfitBudgetStandard.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { subcategory: 'asc' },
      ],
    });

    return standards;
  }

  /**
   * Calculate budget totals including indirect costs
   */
  private calculateTotals(
    lineItems: BudgetLineItem[],
    customIndirectRate?: number
  ): {
    totalDirectCosts: number;
    indirectCosts: number;
    totalCosts: number;
    indirectRate: number;
  } {
    // Calculate total direct costs (excluding equipment from MTDC)
    const totalDirectCosts = lineItems.reduce((sum, item) => sum + item.totalCost, 0);

    // Calculate Modified Total Direct Costs (MTDC) - excludes equipment > $5000
    const mtdc = lineItems
      .filter(item => {
        if (item.category === 'Equipment' && item.unitCost > 5000) {
          return false; // Exclude equipment over $5000 from MTDC
        }
        return true;
      })
      .reduce((sum, item) => sum + item.totalCost, 0);

    // Use custom rate if provided, otherwise default to 10% de minimis
    const indirectRate = customIndirectRate !== undefined ? customIndirectRate : 0.10;

    // Calculate indirect costs based on MTDC
    const indirectCosts = mtdc * indirectRate;

    // Total costs = direct + indirect
    const totalCosts = totalDirectCosts + indirectCosts;

    return {
      totalDirectCosts: Math.round(totalDirectCosts * 100) / 100,
      indirectCosts: Math.round(indirectCosts * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
      indirectRate,
    };
  }

  /**
   * Validate budget against standards
   */
  async validateBudget(budgetId: string, grantType: 'federal' | 'foundation' | 'corporate' = 'federal') {
    const budget = await this.prisma.proposalBudget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // Get relevant standards
    const standards = await this.getBudgetStandards(grantType);

    const lineItems = budget.lineItems as unknown as BudgetLineItem[];
    const issues: string[] = [];

    // Check each line item against standards
    for (const item of lineItems) {
      const categoryStandards = standards.filter(s => s.category === item.category);

      for (const standard of categoryStandards) {
        // Check if expense is allowable
        if (!standard.allowableExpense) {
          issues.push(
            `${item.category} - ${item.subcategory}: This expense is not allowable under ${grantType} grants. ${standard.guideline}`
          );
        }

        // Check if prior approval required
        if (standard.requiresApproval && item.category === standard.category) {
          issues.push(
            `${item.category} - ${item.subcategory}: Requires prior approval from funder. ${standard.notes || ''}`
          );
        }

        // Check against max rates if applicable
        if (standard.maxRate && item.category === 'Contractual') {
          const dailyRate = item.unitCost;
          const maxDailyRate = Number(standard.maxRate) * 1000; // Convert to daily rate approximation
          if (dailyRate > maxDailyRate) {
            issues.push(
              `${item.category} - ${item.description}: Rate of $${dailyRate}/day may exceed typical consultant rates ($${maxDailyRate}/day). ${standard.notes || ''}`
            );
          }
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      standards: categoryStandards.map(s => ({
        category: s.category,
        subcategory: s.subcategory,
        guideline: s.guideline,
        ombReference: s.ombReference,
      })),
    };
  }

  /**
   * Generate budget narrative from line items
   */
  async generateNarrative(budgetId: string): Promise<string> {
    const budget = await this.prisma.proposalBudget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    const lineItems = budget.lineItems as unknown as BudgetLineItem[];

    // Group by category
    const categories = this.groupByCategory(lineItems);

    let narrative = 'BUDGET NARRATIVE\n\n';

    for (const [category, items] of Object.entries(categories)) {
      narrative += `${category.toUpperCase()}\n`;

      const categoryTotal = items.reduce((sum, item) => sum + item.totalCost, 0);

      for (const item of items) {
        narrative += `\n${item.subcategory} - ${item.description}\n`;
        narrative += `${item.quantity} × $${item.unitCost.toFixed(2)} = $${item.totalCost.toFixed(2)}\n`;

        if (item.justification) {
          narrative += `${item.justification}\n`;
        }
      }

      narrative += `\n${category} Subtotal: $${categoryTotal.toFixed(2)}\n\n`;
    }

    narrative += `\nTotal Direct Costs: $${Number(budget.totalDirectCosts).toFixed(2)}\n`;
    narrative += `Indirect Costs (${(Number(budget.indirectRate) * 100).toFixed(1)}%): $${Number(budget.indirectCosts).toFixed(2)}\n`;
    narrative += `\nTOTAL PROJECT COSTS: $${Number(budget.totalCosts).toFixed(2)}\n`;

    return narrative;
  }

  /**
   * Group line items by category
   */
  private groupByCategory(lineItems: BudgetLineItem[]): Record<string, BudgetLineItem[]> {
    return lineItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, BudgetLineItem[]>);
  }
}
