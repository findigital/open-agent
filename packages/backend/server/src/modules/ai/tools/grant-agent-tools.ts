/**
 * Grant-Specific Agent Tools
 * Adapts copilot grant tools for use by AI agents
 */

import { Config } from '../../../base';
import { PrismaService } from '../../../base/prisma/prisma.service';
import { AgentTool, AgentContext } from '../types/agent.types';
import { zodToJsonSchema } from './zod-to-json-schema';

// Import copilot grant tool factories
import { createGrantsGovSearchTool } from '../../../plugins/copilot/tools/grants-gov-search';
import { createFunderResearchTool } from '../../../plugins/copilot/tools/funder-research';
import { createResearchCitationsTool } from '../../../plugins/copilot/tools/research-citations';
import { createGrantEligibilityCheckTool } from '../../../plugins/copilot/tools/grant-eligibility-check';
import { createBudgetValidatorTool } from '../../../plugins/copilot/tools/budget-validator';
import { createImpactMetricsCalculatorTool } from '../../../plugins/copilot/tools/impact-metrics-calculator';

/**
 * Create grant-specific tools for AI agents
 * These tools are adapted from the copilot system to work in agent workflows
 */
export function createGrantAgentTools(
  config: Config,
  prisma: PrismaService
): AgentTool[] {
  const tools: AgentTool[] = [];

  // 1. Grants.gov Search Tool
  if (config.copilot.exa?.key) {
    const grantsGovTool = createGrantsGovSearchTool(config);
    tools.push({
      name: 'grants_gov_search',
      description: grantsGovTool.description as string,
      inputSchema: zodToJsonSchema(grantsGovTool.parameters),
      handler: async (input: any, context: AgentContext) => {
        return await grantsGovTool.execute(input, {} as any);
      },
    });
  }

  // 2. Funder Research Tool
  if (config.copilot.exa?.key) {
    const funderResearchTool = createFunderResearchTool(config);
    tools.push({
      name: 'funder_research',
      description: funderResearchTool.description as string,
      inputSchema: zodToJsonSchema(funderResearchTool.parameters),
      handler: async (input: any, context: AgentContext) => {
        return await funderResearchTool.execute(input, {} as any);
      },
    });
  }

  // 3. Research Citations Tool
  if (config.copilot.exa?.key) {
    const researchCitationsTool = createResearchCitationsTool(config);
    tools.push({
      name: 'research_citations',
      description: researchCitationsTool.description as string,
      inputSchema: zodToJsonSchema(researchCitationsTool.parameters),
      handler: async (input: any, context: AgentContext) => {
        return await researchCitationsTool.execute(input, {} as any);
      },
    });
  }

  // 4. Grant Eligibility Check Tool
  const eligibilityTool = createGrantEligibilityCheckTool(config, prisma);
  tools.push({
    name: 'grant_eligibility_check',
    description: eligibilityTool.description as string,
    inputSchema: zodToJsonSchema(eligibilityTool.parameters),
    handler: async (input: any, context: AgentContext) => {
      // Add organization context from AgentContext
      const inputWithContext = {
        ...input,
        organizationId: context.organizationId,
      };
      return await eligibilityTool.execute(inputWithContext, {} as any);
    },
  });

  // 5. Budget Validator Tool
  const budgetValidatorTool = createBudgetValidatorTool();
  tools.push({
    name: 'budget_validator',
    description: budgetValidatorTool.description as string,
    inputSchema: zodToJsonSchema(budgetValidatorTool.parameters),
    handler: async (input: any, context: AgentContext) => {
      return await budgetValidatorTool.execute(input, {} as any);
    },
  });

  // 6. Impact Metrics Calculator Tool
  const impactMetricsTool = createImpactMetricsCalculatorTool();
  tools.push({
    name: 'impact_metrics_calculator',
    description: impactMetricsTool.description as string,
    inputSchema: zodToJsonSchema(impactMetricsTool.parameters),
    handler: async (input: any, context: AgentContext) => {
      return await impactMetricsTool.execute(input, {} as any);
    },
  });

  // 7. Budget Calculator Tool (Simplified - no file generation)
  tools.push({
    name: 'budget_calculator',
    description: 'Calculate grant budget with personnel costs, fringe benefits, and indirect costs. Returns budget breakdown as structured data (no Excel file in agent mode).',
    inputSchema: {
      type: 'object',
      properties: {
        personnel: {
          type: 'array',
          description: 'Array of personnel positions',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', description: 'Job title/role' },
              salary: { type: 'number', description: 'Annual salary in USD' },
              ftePercent: { type: 'number', description: 'FTE percentage (0-100)' },
              fringeRate: { type: 'number', description: 'Fringe benefit rate as percentage' },
            },
            required: ['role', 'salary', 'ftePercent', 'fringeRate'],
          },
        },
        otherDirectCosts: {
          type: 'array',
          description: 'Other direct costs',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Budget category' },
              item: { type: 'string', description: 'Line item description' },
              amount: { type: 'number', description: 'Cost in USD' },
            },
            required: ['category', 'item', 'amount'],
          },
        },
        indirectRate: {
          type: 'number',
          description: 'Indirect cost rate as percentage',
        },
      },
      required: ['personnel', 'indirectRate'],
    },
    handler: async (input: any, context: AgentContext) => {
      // Simplified budget calculation without E2B/Excel generation
      const { personnel, otherDirectCosts = [], indirectRate } = input;

      // Calculate personnel costs
      let totalPersonnel = 0;
      let totalFringe = 0;
      const personnelBreakdown = personnel.map((person: any) => {
        const baseCost = person.salary * (person.ftePercent / 100);
        const fringeCost = baseCost * (person.fringeRate / 100);
        totalPersonnel += baseCost;
        totalFringe += fringeCost;
        return {
          role: person.role,
          baseCost,
          fringeCost,
          total: baseCost + fringeCost,
        };
      });

      // Calculate other direct costs
      let totalOtherDirect = 0;
      const otherDirectBreakdown = otherDirectCosts.map((item: any) => {
        totalOtherDirect += item.amount;
        return {
          category: item.category,
          item: item.item,
          amount: item.amount,
        };
      });

      // Calculate totals
      const totalDirectCosts = totalPersonnel + totalFringe + totalOtherDirect;
      const indirectCosts = totalDirectCosts * (indirectRate / 100);
      const totalProjectCost = totalDirectCosts + indirectCosts;

      return {
        summary: {
          totalPersonnel,
          totalFringe,
          totalOtherDirect,
          totalDirectCosts,
          indirectCosts,
          totalProjectCost,
        },
        breakdown: {
          personnel: personnelBreakdown,
          otherDirect: otherDirectBreakdown,
        },
        note: 'This is a simplified calculation. For Excel export, use the copilot interface.',
      };
    },
  });

  // 8. Timeline Generator Tool (Simplified - text-based)
  tools.push({
    name: 'timeline_generator',
    description: 'Generate project timeline and task breakdown for grant proposals. Returns text-based timeline (no Gantt chart in agent mode).',
    inputSchema: {
      type: 'object',
      properties: {
        projectTitle: { type: 'string', description: 'Project title' },
        startDate: { type: 'string', description: 'Project start date (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'Project end date (YYYY-MM-DD)' },
        phases: {
          type: 'array',
          description: 'Project phases or activities',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Phase/activity name' },
              description: { type: 'string', description: 'Description' },
              durationMonths: { type: 'number', description: 'Duration in months' },
              dependencies: {
                type: 'array',
                items: { type: 'string' },
                description: 'Names of dependent phases (must complete first)',
              },
            },
            required: ['name', 'durationMonths'],
          },
        },
      },
      required: ['projectTitle', 'startDate', 'endDate', 'phases'],
    },
    handler: async (input: any, context: AgentContext) => {
      const { projectTitle, startDate, endDate, phases } = input;

      // Calculate total duration
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalMonths = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

      // Generate timeline text
      let timeline = `Project Timeline: ${projectTitle}\n`;
      timeline += `Duration: ${startDate} to ${endDate} (${totalMonths} months)\n\n`;

      let currentMonth = 0;
      phases.forEach((phase: any, index: number) => {
        const phaseStart = currentMonth + 1;
        const phaseEnd = currentMonth + phase.durationMonths;
        timeline += `Phase ${index + 1}: ${phase.name}\n`;
        timeline += `  Timeline: Months ${phaseStart}-${phaseEnd}\n`;
        if (phase.description) {
          timeline += `  Description: ${phase.description}\n`;
        }
        if (phase.dependencies && phase.dependencies.length > 0) {
          timeline += `  Dependencies: ${phase.dependencies.join(', ')}\n`;
        }
        timeline += '\n';
        currentMonth = phaseEnd;
      });

      return {
        timeline,
        totalMonths,
        phaseCount: phases.length,
        note: 'This is a text-based timeline. For Gantt chart export, use the copilot interface.',
      };
    },
  });

  // NOTE: Competitive Analysis and Proposal Analyzer tools are NOT included
  // because they require CopilotProviderFactory which isn't available in agent context.
  // These tools use nested AI calls which should be handled at the agent level instead.

  return tools;
}
