import { AgentTool, AgentContext } from '../ai/types/agent.types';
import { BudgetService } from './budget.service';

/**
 * Budget-Specific AI Agent Tools
 * These tools enable the Budget Agent to access financial data and standards
 */

export function createBudgetTools(budgetService: BudgetService): AgentTool[] {
  return [
    // Tool 1: Get Organization Financials
    {
      name: 'get_organization_financials',
      description: 'Retrieve organization financial data including salaries, fringe benefit rates, indirect cost rates, and travel policies',
      inputSchema: {
        type: 'object',
        properties: {
          organizationId: {
            type: 'string',
            description: 'The organization ID to retrieve financial data for',
          },
        },
        required: ['organizationId'],
      },
      handler: async (input: any) => {
        const financials = await budgetService.getOrganizationFinancials(input.organizationId);

        if (!financials) {
          return {
            error: 'No financial data found for this organization',
            suggestion: 'Organization should set up financial data including salary ranges and benefit rates',
          };
        }

        return {
          salaryRanges: financials.salaryRanges,
          fringeBenefitRate: Number(financials.fringeBenefitRate),
          indirectCostRate: financials.indirectCostRate ? Number(financials.indirectCostRate) : 0.10,
          indirectCostRateType: financials.indirectCostRateType,
          fiscalYear: {
            start: financials.fiscalYearStart,
            end: financials.fiscalYearEnd,
          },
          travelPolicies: financials.travelPolicies,
          equipmentThreshold: Number(financials.equipmentThreshold),
        };
      },
    },

    // Tool 2: Search Budget Templates
    {
      name: 'search_budget_templates',
      description: 'Search for budget templates by category (federal, foundation, corporate) to use as a starting point',
      inputSchema: {
        type: 'object',
        properties: {
          organizationId: {
            type: 'string',
            description: 'The organization ID',
          },
          category: {
            type: 'string',
            enum: ['federal', 'foundation', 'corporate'],
            description: 'The grant type to find templates for',
          },
        },
        required: ['organizationId', 'category'],
      },
      handler: async (input: any) => {
        const templates = await budgetService.getTemplates(input.organizationId, input.category);

        return {
          category: input.category,
          templates: templates.map(template => ({
            id: template.id,
            name: template.name,
            description: template.description,
            usageCount: template.usageCount,
            lineItems: template.lineItems,
            isPublic: template.isPublic,
          })),
          count: templates.length,
        };
      },
    },

    // Tool 3: Get Non-Profit Budget Standards
    {
      name: 'get_nonprofit_standards',
      description: 'Get non-profit budget standards and best practices including OMB 2 CFR 200 regulations for federal grants',
      inputSchema: {
        type: 'object',
        properties: {
          standardType: {
            type: 'string',
            enum: ['federal', 'foundation', 'corporate'],
            description: 'The type of grant standards to retrieve',
          },
          category: {
            type: 'string',
            enum: ['Personnel', 'Travel', 'Equipment', 'Supplies', 'Contractual', 'Other', 'Indirect', 'Unallowable', 'Administrative'],
            description: 'Filter by budget category',
          },
        },
      },
      handler: async (input: any) => {
        const standards = await budgetService.getBudgetStandards(
          input.standardType,
          input.category
        );

        return {
          standardType: input.standardType || 'all',
          category: input.category || 'all',
          standards: standards.map(standard => ({
            category: standard.category,
            subcategory: standard.subcategory,
            guideline: standard.guideline,
            source: standard.source,
            ombReference: standard.ombReference,
            maxRate: standard.maxRate ? Number(standard.maxRate) : undefined,
            allowableExpense: standard.allowableExpense,
            requiresApproval: standard.requiresApproval,
            notes: standard.notes,
          })),
          count: standards.length,
        };
      },
    },

    // Tool 4: Calculate Indirect Costs
    {
      name: 'calculate_indirect_costs',
      description: 'Calculate indirect costs using organization rate or 10% de minimis rate. Applies to Modified Total Direct Costs (MTDC), excluding equipment over $5,000',
      inputSchema: {
        type: 'object',
        properties: {
          directCosts: {
            type: 'array',
            description: 'Array of direct cost line items',
            items: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Budget category (Personnel, Travel, Equipment, etc.)',
                },
                amount: {
                  type: 'number',
                  description: 'Cost amount',
                },
                unitCost: {
                  type: 'number',
                  description: 'Unit cost (for equipment threshold check)',
                },
              },
            },
          },
          indirectRate: {
            type: 'number',
            description: 'Indirect cost rate (0-1 decimal). Defaults to 0.10 (10% de minimis)',
          },
        },
        required: ['directCosts'],
      },
      handler: async (input: any) => {
        const directCosts = input.directCosts || [];
        const indirectRate = input.indirectRate !== undefined ? input.indirectRate : 0.10;

        // Calculate total direct costs
        const totalDirectCosts = directCosts.reduce(
          (sum: number, item: any) => sum + (item.amount || 0),
          0
        );

        // Calculate MTDC (Modified Total Direct Costs) - excludes equipment > $5000
        const mtdc = directCosts
          .filter((item: any) => {
            if (item.category === 'Equipment' && item.unitCost && item.unitCost > 5000) {
              return false;
            }
            return true;
          })
          .reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

        const indirectCosts = mtdc * indirectRate;
        const totalCosts = totalDirectCosts + indirectCosts;

        return {
          totalDirectCosts: Math.round(totalDirectCosts * 100) / 100,
          mtdc: Math.round(mtdc * 100) / 100,
          indirectRate,
          indirectCosts: Math.round(indirectCosts * 100) / 100,
          totalCosts: Math.round(totalCosts * 100) / 100,
          calculation: {
            formula: 'Indirect Costs = MTDC × Indirect Rate',
            mtdcExclusions: 'Equipment over $5,000',
            rateUsed: indirectRate === 0.10 ? '10% de minimis' : `${(indirectRate * 100).toFixed(1)}% negotiated rate`,
          },
        };
      },
    },

    // Tool 5: Validate Budget Line Item
    {
      name: 'validate_budget_item',
      description: 'Validate a budget line item against non-profit standards to ensure it is allowable and properly justified',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Budget category (Personnel, Travel, Equipment, etc.)',
          },
          subcategory: {
            type: 'string',
            description: 'Subcategory or specific type of expense',
          },
          amount: {
            type: 'number',
            description: 'Total cost for this line item',
          },
          unitCost: {
            type: 'number',
            description: 'Cost per unit (for rate validation)',
          },
          grantType: {
            type: 'string',
            enum: ['federal', 'foundation', 'corporate'],
            description: 'Type of grant this budget is for',
          },
        },
        required: ['category', 'amount', 'grantType'],
      },
      handler: async (input: any) => {
        const standards = await budgetService.getBudgetStandards(input.grantType, input.category);

        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check against each applicable standard
        for (const standard of standards) {
          // Check if subcategory matches
          if (input.subcategory && standard.subcategory && input.subcategory !== standard.subcategory) {
            continue;
          }

          // Check allowability
          if (!standard.allowableExpense) {
            issues.push(
              `${input.category}${input.subcategory ? ' - ' + input.subcategory : ''} is NOT ALLOWABLE under ${input.grantType} grants. ${standard.guideline}`
            );
          }

          // Check approval requirements
          if (standard.requiresApproval) {
            recommendations.push(
              `This expense requires prior approval from the funder. ${standard.notes || ''}`
            );
          }

          // Check max rates for consultants
          if (standard.maxRate && input.category === 'Contractual' && input.unitCost) {
            const maxDailyRate = Number(standard.maxRate) * 1000;
            if (input.unitCost > maxDailyRate) {
              recommendations.push(
                `Daily rate of $${input.unitCost} may exceed typical range ($${maxDailyRate}). Provide strong justification. ${standard.notes || ''}`
              );
            }
          }

          // Add guidance from standards
          if (standard.allowableExpense && standard.notes) {
            recommendations.push(standard.notes);
          }
        }

        return {
          isValid: issues.length === 0,
          category: input.category,
          subcategory: input.subcategory,
          amount: input.amount,
          grantType: input.grantType,
          issues,
          recommendations,
          relevantStandards: standards.map(s => ({
            guideline: s.guideline,
            source: s.source,
            ombReference: s.ombReference,
          })),
        };
      },
    },

    // Tool 6: Get Past Budget Data
    {
      name: 'get_past_budgets',
      description: 'Retrieve past proposal budgets for similar projects to use as reference',
      inputSchema: {
        type: 'object',
        properties: {
          organizationId: {
            type: 'string',
            description: 'The organization ID',
          },
          grantType: {
            type: 'string',
            enum: ['federal', 'foundation', 'corporate'],
            description: 'Type of grant to find similar budgets for',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of past budgets to return',
            default: 5,
          },
        },
        required: ['organizationId'],
      },
      handler: async (input: any, context?: AgentContext) => {
        // This is a placeholder that would integrate with the proposal/budget services
        // In a real implementation, this would query past budgets with similar characteristics

        return {
          message: 'Past budget retrieval would integrate with proposal service',
          note: 'This tool would search for budgets from similar proposals (same grant type, similar amount, etc.)',
          organizationId: input.organizationId,
          grantType: input.grantType,
          // In real implementation:
          // budgets: await budgetService.findSimilarBudgets(input.organizationId, input.grantType, input.limit)
        };
      },
    },
  ];
}

/**
 * Tool definitions for Anthropic Claude API
 * These match the format required by the Messages API
 */
export const budgetToolDefinitions = [
  {
    name: 'get_organization_financials',
    description: 'Retrieve organization financial data including salaries, fringe benefit rates, indirect cost rates, and travel policies. Use this to get accurate salary ranges and benefit rates for personnel budgets.',
    input_schema: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'The organization ID to retrieve financial data for',
        },
      },
      required: ['organizationId'],
    },
  },
  {
    name: 'search_budget_templates',
    description: 'Search for budget templates by category (federal, foundation, corporate). Templates provide pre-structured line items based on grant type.',
    input_schema: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'The organization ID',
        },
        category: {
          type: 'string',
          enum: ['federal', 'foundation', 'corporate'],
          description: 'The grant type to find templates for',
        },
      },
      required: ['organizationId', 'category'],
    },
  },
  {
    name: 'get_nonprofit_standards',
    description: 'Get non-profit budget standards including OMB 2 CFR 200 for federal grants. Use this to ensure budget compliance and understand allowable costs.',
    input_schema: {
      type: 'object',
      properties: {
        standardType: {
          type: 'string',
          enum: ['federal', 'foundation', 'corporate'],
          description: 'The type of grant standards to retrieve',
        },
        category: {
          type: 'string',
          enum: ['Personnel', 'Travel', 'Equipment', 'Supplies', 'Contractual', 'Other', 'Indirect', 'Unallowable', 'Administrative'],
          description: 'Filter by budget category',
        },
      },
    },
  },
  {
    name: 'calculate_indirect_costs',
    description: 'Calculate indirect costs using MTDC (Modified Total Direct Costs). Excludes equipment over $5,000 from the base. Use organization rate or 10% de minimis.',
    input_schema: {
      type: 'object',
      properties: {
        directCosts: {
          type: 'array',
          description: 'Array of direct cost line items with category and amount',
          items: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Budget category (Personnel, Travel, Equipment, etc.)',
              },
              amount: {
                type: 'number',
                description: 'Cost amount',
              },
              unitCost: {
                type: 'number',
                description: 'Unit cost (for equipment threshold check)',
              },
            },
          },
        },
        indirectRate: {
          type: 'number',
          description: 'Indirect cost rate as decimal (0.10 = 10%). Defaults to 10% de minimis if not provided.',
        },
      },
      required: ['directCosts'],
    },
  },
  {
    name: 'validate_budget_item',
    description: 'Validate a budget line item against standards to check if allowable and identify required approvals. Essential before adding items to budget.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Budget category (Personnel, Travel, Equipment, Supplies, Contractual, Other, Indirect)',
        },
        subcategory: {
          type: 'string',
          description: 'Subcategory or specific type of expense',
        },
        amount: {
          type: 'number',
          description: 'Total cost for this line item',
        },
        unitCost: {
          type: 'number',
          description: 'Cost per unit (for rate validation)',
        },
        grantType: {
          type: 'string',
          enum: ['federal', 'foundation', 'corporate'],
          description: 'Type of grant this budget is for',
        },
      },
      required: ['category', 'amount', 'grantType'],
    },
  },
  {
    name: 'get_past_budgets',
    description: 'Retrieve past proposal budgets for similar projects to use as reference for realistic cost estimates.',
    input_schema: {
      type: 'object',
      properties: {
        organizationId: {
          type: 'string',
          description: 'The organization ID',
        },
        grantType: {
          type: 'string',
          enum: ['federal', 'foundation', 'corporate'],
          description: 'Type of grant to find similar budgets for',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of past budgets to return',
        },
      },
      required: ['organizationId'],
    },
  },
];
