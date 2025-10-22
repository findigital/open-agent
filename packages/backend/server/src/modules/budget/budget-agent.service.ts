import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { BudgetService, BudgetLineItem } from './budget.service';
import { budgetToolDefinitions } from './budget-tools';
import { AgentContext } from '../ai/types/agent.types';

export interface BudgetGenerationInput {
  proposalId: string;
  organizationId: string;
  projectDescription: string;
  requestedAmount?: number;
  grantType: 'federal' | 'foundation' | 'corporate';
  projectDuration: number; // in months
  personnelNeeds?: string;
  equipmentNeeds?: string;
  travelRequirements?: string;
}

export interface BudgetGenerationResult {
  budgetId: string;
  lineItems: BudgetLineItem[];
  totalDirectCosts: number;
  indirectCosts: number;
  totalCosts: number;
  narrative: string;
  warnings: string[];
  iterations: number;
}

@Injectable()
export class BudgetAgentService {
  private readonly logger = new Logger(BudgetAgentService.name);
  private readonly anthropic: Anthropic;
  private readonly defaultModel = 'claude-3-5-sonnet-20241022';
  private readonly maxIterations = 10;

  constructor(private budgetService: BudgetService) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured - Budget AI features will not work');
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey || 'placeholder',
    });
  }

  /**
   * Generate a comprehensive budget using AI agent with tool calling
   */
  async generateBudget(input: BudgetGenerationInput, userId: string): Promise<BudgetGenerationResult> {
    this.logger.log(`Starting budget generation for proposal ${input.proposalId}`);

    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    // Initialize conversation
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    let continueLoop = true;
    let iterations = 0;
    let finalBudget: any = null;
    const warnings: string[] = [];

    // Agentic loop - agent uses tools until budget is complete
    while (continueLoop && iterations < this.maxIterations) {
      iterations++;
      this.logger.log(`Budget generation iteration ${iterations}`);

      try {
        const response = await this.anthropic.messages.create({
          model: this.defaultModel,
          max_tokens: 16000,
          temperature: 0.3, // Lower temperature for more consistent budget generation
          system: systemPrompt,
          messages,
          tools: budgetToolDefinitions,
        });

        // Check if agent wants to use tools
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ContentBlock & { type: 'tool_use' } => block.type === 'tool_use'
        );

        if (toolUseBlocks.length === 0) {
          // No more tools to use - agent is done
          continueLoop = false;

          // Extract final budget from response
          const textBlock = response.content.find(
            (block): block is Anthropic.ContentBlock & { type: 'text' } => block.type === 'text'
          );

          if (textBlock) {
            finalBudget = this.extractBudgetFromResponse(textBlock.text);
          }

          break;
        }

        // Execute tools
        const toolResults: Anthropic.MessageParam['content'] = [];

        for (const toolBlock of toolUseBlocks) {
          this.logger.log(`Executing tool: ${toolBlock.name}`);

          try {
            const result = await this.executeTool(toolBlock.name, toolBlock.input, input.organizationId);

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: JSON.stringify(result),
            });
          } catch (error: any) {
            this.logger.error(`Tool execution failed for ${toolBlock.name}:`, error);

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: JSON.stringify({ error: error.message }),
              is_error: true,
            });
          }
        }

        // Add assistant response and tool results to conversation
        messages.push({
          role: 'assistant',
          content: response.content,
        });

        messages.push({
          role: 'user',
          content: toolResults,
        });
      } catch (error: any) {
        this.logger.error('Budget generation iteration failed:', error);
        warnings.push(`Iteration ${iterations} failed: ${error.message}`);

        if (iterations >= this.maxIterations) {
          throw new Error('Budget generation failed after maximum iterations');
        }
      }
    }

    if (!finalBudget) {
      throw new Error('Budget generation did not produce a valid budget');
    }

    // Create budget in database
    const budget = await this.budgetService.create(userId, {
      proposalId: input.proposalId,
      lineItems: finalBudget.lineItems,
      indirectRate: finalBudget.indirectRate,
      narrative: finalBudget.narrative,
    });

    return {
      budgetId: budget.id,
      lineItems: finalBudget.lineItems,
      totalDirectCosts: Number(budget.totalDirectCosts),
      indirectCosts: Number(budget.indirectCosts),
      totalCosts: Number(budget.totalCosts),
      narrative: finalBudget.narrative,
      warnings,
      iterations,
    };
  }

  /**
   * Build system prompt for Budget Agent
   */
  private buildSystemPrompt(input: BudgetGenerationInput): string {
    return `You are an expert non-profit budget specialist with deep knowledge of:
- OMB Uniform Guidance (2 CFR 200) for federal grants
- Foundation and corporate grant budgeting best practices
- Non-profit accounting standards
- Realistic cost estimation

Your role is to create a comprehensive, compliant, and realistic budget for a grant proposal.

## Process
1. Use tools to gather necessary information:
   - get_organization_financials: Get salary ranges, benefit rates, and policies
   - get_nonprofit_standards: Understand compliance requirements for ${input.grantType} grants
   - search_budget_templates: Find templates for ${input.grantType} grants
   - validate_budget_item: Validate each line item before including

2. Create line items for all budget categories:
   - Personnel (salaries and fringe benefits)
   - Travel (if needed based on project)
   - Equipment (if needed)
   - Supplies
   - Contractual/Consultants (if needed)
   - Other Direct Costs
   - Indirect Costs

3. For each line item, provide:
   - Clear description
   - Quantity and unit cost
   - Total cost calculation
   - Brief justification

4. Calculate indirect costs:
   - Use organization's negotiated rate OR 10% de minimis
   - Apply to Modified Total Direct Costs (MTDC)
   - Exclude equipment over $5,000 from MTDC

5. Ensure compliance:
   - All costs are allowable under ${input.grantType} grant rules
   - Costs are reasonable and well-justified
   - Total budget aligns with requested amount (${input.requestedAmount ? '$' + input.requestedAmount : 'not specified'})

6. Generate budget narrative explaining all line items

When you have completed the budget, respond with a JSON object in this exact format:
\`\`\`json
{
  "lineItems": [
    {
      "id": "unique-id",
      "category": "Personnel",
      "subcategory": "Program Director",
      "description": "Program Director - 50% FTE",
      "quantity": 12,
      "unitCost": 3250.00,
      "totalCost": 39000.00,
      "justification": "Program Director will oversee all project activities..."
    }
  ],
  "indirectRate": 0.15,
  "narrative": "Full budget narrative..."
}
\`\`\``;
  }

  /**
   * Build user prompt with project details
   */
  private buildUserPrompt(input: BudgetGenerationInput): string {
    let prompt = `Create a detailed budget for this grant proposal:\n\n`;
    prompt += `## Project Overview\n`;
    prompt += `${input.projectDescription}\n\n`;
    prompt += `## Budget Requirements\n`;
    prompt += `- Grant Type: ${input.grantType}\n`;
    prompt += `- Project Duration: ${input.projectDuration} months\n`;

    if (input.requestedAmount) {
      prompt += `- Requested Amount: $${input.requestedAmount.toLocaleString()}\n`;
    }

    if (input.personnelNeeds) {
      prompt += `\n## Personnel Needs\n${input.personnelNeeds}\n`;
    }

    if (input.equipmentNeeds) {
      prompt += `\n## Equipment Needs\n${input.equipmentNeeds}\n`;
    }

    if (input.travelRequirements) {
      prompt += `\n## Travel Requirements\n${input.travelRequirements}\n`;
    }

    prompt += `\n## Instructions\n`;
    prompt += `1. Use tools to gather organization financial data and standards\n`;
    prompt += `2. Create comprehensive budget with all necessary line items\n`;
    prompt += `3. Validate all items for compliance with ${input.grantType} grant rules\n`;
    prompt += `4. Calculate indirect costs properly\n`;
    prompt += `5. Generate clear budget narrative\n`;
    prompt += `6. Return final budget in the specified JSON format\n`;

    return prompt;
  }

  /**
   * Execute a budget tool
   */
  private async executeTool(toolName: string, input: any, organizationId: string): Promise<any> {
    switch (toolName) {
      case 'get_organization_financials':
        return await this.budgetService.getOrganizationFinancials(input.organizationId || organizationId);

      case 'search_budget_templates':
        return await this.budgetService.getTemplates(
          input.organizationId || organizationId,
          input.category
        );

      case 'get_nonprofit_standards':
        return await this.budgetService.getBudgetStandards(input.standardType, input.category);

      case 'calculate_indirect_costs':
        // This is a calculation tool - execute inline
        const directCosts = input.directCosts || [];
        const indirectRate = input.indirectRate !== undefined ? input.indirectRate : 0.10;

        const totalDirectCosts = directCosts.reduce(
          (sum: number, item: any) => sum + (item.amount || 0),
          0
        );

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
        };

      case 'validate_budget_item':
        const standards = await this.budgetService.getBudgetStandards(input.grantType, input.category);
        const issues: string[] = [];

        for (const standard of standards) {
          if (!standard.allowableExpense) {
            issues.push(`${input.category} is not allowable under ${input.grantType} grants`);
          }
        }

        return {
          isValid: issues.length === 0,
          issues,
          standards: standards.map(s => ({
            guideline: s.guideline,
            source: s.source,
          })),
        };

      case 'get_past_budgets':
        return {
          message: 'Past budgets feature not yet implemented',
          organizationId: input.organizationId,
        };

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Extract budget data from agent's final response
   */
  private extractBudgetFromResponse(responseText: string): any {
    // Extract JSON from code block
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);

    if (!jsonMatch) {
      // Try to find JSON without code block
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Could not find budget JSON in response');
      }

      const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    }

    return JSON.parse(jsonMatch[1]);
  }
}
