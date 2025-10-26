import { z } from 'zod';

import { toolError } from './error';
import { createTool } from './utils';

/**
 * Validate budget against grant requirements and best practices
 * Checks compliance with funding limits, indirect rates, and budget standards
 */
export const createBudgetValidatorTool = () => {
  return createTool(
    { toolName: 'budget_validator' },
    {
      description: `Validate budget against grant requirements and industry best practices.

Use this when you need to:
- Check budget compliance before submission
- Verify total within grant maximum
- Validate indirect cost rates
- Ensure required budget categories included

Returns: Validation report with compliance status, issues, and warnings.`,
      inputSchema: z.object({
        budgetItems: z
          .array(
            z.object({
              category: z.string().describe('Budget category'),
              amount: z.number().describe('Amount in USD'),
            })
          )
          .describe('Budget line items'),
        grantMaxAmount: z.number().describe('Maximum grant amount allowed'),
        indirectRateAllowed: z
          .number()
          .optional()
          .describe('Maximum indirect rate allowed (as percentage)'),
        requiredCategories: z
          .array(z.string())
          .optional()
          .describe('Required budget categories'),
        restrictions: z
          .array(z.string())
          .optional()
          .describe('Budget restrictions or rules'),
      }),
      execute: async ({
        budgetItems,
        grantMaxAmount,
        indirectRateAllowed,
        requiredCategories,
        restrictions,
      }) => {
        try {
          const issues: any[] = [];
          const warnings: any[] = [];

          // Calculate totals
          const totalBudget = budgetItems.reduce((sum, item) => sum + item.amount, 0);

          // Find direct and indirect costs
          const indirectCost = budgetItems.find(item =>
            item.category.toLowerCase().includes('indirect')
          );
          const directCosts = budgetItems.filter(
            item => !item.category.toLowerCase().includes('indirect')
          );
          const totalDirect = directCosts.reduce((sum, item) => sum + item.amount, 0);

          // 1. Check total budget against maximum
          if (totalBudget > grantMaxAmount) {
            issues.push({
              severity: 'error',
              category: 'Budget Total',
              issue: `Total budget ($${totalBudget.toLocaleString()}) exceeds grant maximum ($${grantMaxAmount.toLocaleString()})`,
              difference: totalBudget - grantMaxAmount,
              suggestion: `Reduce budget by $${(totalBudget - grantMaxAmount).toLocaleString()}`,
            });
          }

          // 2. Check indirect rate
          if (indirectCost && indirectRateAllowed !== undefined) {
            const actualRate = (indirectCost.amount / totalDirect) * 100;
            if (actualRate > indirectRateAllowed) {
              issues.push({
                severity: 'error',
                category: 'Indirect Rate',
                issue: `Indirect cost rate (${actualRate.toFixed(1)}%) exceeds allowed rate (${indirectRateAllowed}%)`,
                actualRate: actualRate.toFixed(2),
                allowedRate: indirectRateAllowed,
                suggestion: `Reduce indirect costs to $${((totalDirect * indirectRateAllowed) / 100).toLocaleString()}`,
              });
            }
          }

          // 3. Check for required categories
          if (requiredCategories && requiredCategories.length > 0) {
            const presentCategories = budgetItems.map(item =>
              item.category.toLowerCase()
            );

            for (const required of requiredCategories) {
              const found = presentCategories.some(cat =>
                cat.includes(required.toLowerCase())
              );

              if (!found) {
                issues.push({
                  severity: 'error',
                  category: 'Required Categories',
                  issue: `Missing required budget category: "${required}"`,
                  suggestion: `Add "${required}" category to budget`,
                });
              }
            }
          }

          // 4. Check for standard budget categories (warnings)
          const standardCategories = [
            'personnel',
            'fringe',
            'travel',
            'equipment',
            'supplies',
            'contractual',
            'other',
          ];

          const presentCategories = budgetItems.map(item => item.category.toLowerCase());
          const missingStandard: string[] = [];

          for (const standard of standardCategories) {
            const found = presentCategories.some(cat => cat.includes(standard));
            if (!found) {
              missingStandard.push(standard);
            }
          }

          if (missingStandard.length > 0) {
            warnings.push({
              severity: 'warning',
              category: 'Budget Completeness',
              issue: `Missing standard budget categories: ${missingStandard.join(', ')}`,
              suggestion: 'Consider if these categories are applicable to your project',
            });
          }

          // 5. Check for zero-dollar items
          const zeroDollarItems = budgetItems.filter(item => item.amount === 0);
          if (zeroDollarItems.length > 0) {
            warnings.push({
              severity: 'warning',
              category: 'Zero-Dollar Items',
              issue: `${zeroDollarItems.length} budget item(s) have $0 amount`,
              items: zeroDollarItems.map(item => item.category),
              suggestion: 'Remove or update zero-dollar items',
            });
          }

          // 6. Check budget distribution
          const personnelCost = budgetItems
            .filter(item => item.category.toLowerCase().includes('personnel'))
            .reduce((sum, item) => sum + item.amount, 0);

          const personnelPercent = (personnelCost / totalBudget) * 100;

          if (personnelPercent > 80) {
            warnings.push({
              severity: 'warning',
              category: 'Budget Distribution',
              issue: `Personnel costs are ${personnelPercent.toFixed(1)}% of total budget`,
              suggestion: 'Very high personnel costs may raise questions. Ensure this is appropriate for your project.',
            });
          }

          if (personnelPercent < 20 && personnelCost > 0) {
            warnings.push({
              severity: 'info',
              category: 'Budget Distribution',
              issue: `Personnel costs are only ${personnelPercent.toFixed(1)}% of total budget`,
              suggestion: 'Low personnel costs - ensure this aligns with project scope.',
            });
          }

          // 7. Check for very large single items
          for (const item of budgetItems) {
            const itemPercent = (item.amount / totalBudget) * 100;
            if (itemPercent > 50 && !item.category.toLowerCase().includes('personnel')) {
              warnings.push({
                severity: 'warning',
                category: 'Large Expense',
                issue: `${item.category} is ${itemPercent.toFixed(1)}% of total budget`,
                amount: item.amount,
                suggestion: 'Large single expenses may require additional justification',
              });
            }
          }

          // 8. Apply custom restrictions
          if (restrictions && restrictions.length > 0) {
            for (const restriction of restrictions) {
              warnings.push({
                severity: 'info',
                category: 'Custom Restriction',
                issue: restriction,
                suggestion: 'Verify compliance with this restriction',
              });
            }
          }

          // Compile results
          const valid = issues.length === 0;

          return {
            valid,
            totalBudget,
            grantMaxAmount,
            budgetItemCount: budgetItems.length,

            compliance: {
              withinBudget: totalBudget <= grantMaxAmount,
              indirectRateCompliant:
                !indirectCost ||
                !indirectRateAllowed ||
                (indirectCost.amount / totalDirect) * 100 <= indirectRateAllowed,
              hasRequiredCategories:
                !requiredCategories || requiredCategories.length === 0 || issues.filter(i => i.category === 'Required Categories').length === 0,
            },

            summary: {
              totalDirect,
              totalIndirect: indirectCost?.amount || 0,
              indirectRate: indirectCost
                ? ((indirectCost.amount / totalDirect) * 100).toFixed(2) + '%'
                : 'N/A',
              personnelPercent: personnelPercent.toFixed(1) + '%',
            },

            issues,
            warnings,

            recommendation: valid
              ? 'Budget is compliant with all requirements'
              : `Found ${issues.length} issue(s) that must be addressed before submission`,
          };
        } catch (e: any) {
          return toolError('Budget Validation Failed', e.message);
        }
      },
    }
  );
};
