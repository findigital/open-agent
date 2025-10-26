import { z } from 'zod';

import { toolError } from './error';
import { createTool } from './utils';

/**
 * Calculate impact metrics and cost-effectiveness ratios for grant proposals
 * Computes key metrics like cost per beneficiary, ROI, efficiency ratios
 */
export const createImpactMetricsCalculatorTool = () => {
  return createTool(
    { toolName: 'impact_metrics_calculator' },
    {
      description: `Calculate impact metrics and cost-effectiveness for grant proposals.

Use this when you need to:
- Calculate cost per beneficiary
- Compute return on investment (ROI)
- Determine cost-effectiveness ratios
- Calculate program efficiency metrics
- Generate comparative impact data

Returns: Comprehensive impact metrics with interpretations and benchmarks.`,
      inputSchema: z.object({
        projectName: z.string().describe('Project name'),
        totalBudget: z.number().describe('Total project budget'),
        projectDuration: z
          .number()
          .describe('Project duration in months'),
        beneficiaries: z.object({
          direct: z.number().describe('Number of direct beneficiaries'),
          indirect: z
            .number()
            .optional()
            .describe('Number of indirect beneficiaries'),
          demographic: z
            .string()
            .optional()
            .describe('Primary demographic served'),
        }),
        outcomes: z
          .array(
            z.object({
              metric: z.string().describe('Outcome metric name'),
              target: z.number().describe('Target value'),
              unit: z.string().describe('Unit of measurement'),
              timeframe: z
                .string()
                .optional()
                .describe('Timeframe for achievement'),
            })
          )
          .optional()
          .describe('Expected outcomes'),
        leveragedFunds: z
          .number()
          .optional()
          .describe('Additional funds leveraged beyond grant'),
        volunteerHours: z
          .number()
          .optional()
          .describe('Estimated volunteer hours'),
        volunteerHourlyValue: z
          .number()
          .optional()
          .default(29.95)
          .describe('Dollar value per volunteer hour (default: $29.95 from Independent Sector)'),
      }),
      execute: async ({
        projectName,
        totalBudget,
        projectDuration,
        beneficiaries,
        outcomes,
        leveragedFunds,
        volunteerHours,
        volunteerHourlyValue,
      }) => {
        try {
          const metrics: any[] = [];

          // 1. Cost per Direct Beneficiary
          const costPerDirectBeneficiary = totalBudget / beneficiaries.direct;
          metrics.push({
            name: 'Cost per Direct Beneficiary',
            value: costPerDirectBeneficiary,
            formatted: `$${costPerDirectBeneficiary.toFixed(2)}`,
            interpretation: getCostPerBeneficiaryInterpretation(costPerDirectBeneficiary),
            formula: 'Total Budget ÷ Direct Beneficiaries',
          });

          // 2. Cost per Total Beneficiary (if indirect available)
          if (beneficiaries.indirect) {
            const totalBeneficiaries = beneficiaries.direct + beneficiaries.indirect;
            const costPerTotalBeneficiary = totalBudget / totalBeneficiaries;
            metrics.push({
              name: 'Cost per Total Beneficiary',
              value: costPerTotalBeneficiary,
              formatted: `$${costPerTotalBeneficiary.toFixed(2)}`,
              interpretation: 'Lower cost when including indirect beneficiaries shows broader impact',
              formula: 'Total Budget ÷ (Direct + Indirect Beneficiaries)',
            });
          }

          // 3. Monthly Cost per Beneficiary
          const monthlyCostPerBeneficiary =
            totalBudget / (beneficiaries.direct * projectDuration);
          metrics.push({
            name: 'Monthly Cost per Beneficiary',
            value: monthlyCostPerBeneficiary,
            formatted: `$${monthlyCostPerBeneficiary.toFixed(2)}/month`,
            interpretation: 'Average monthly investment per person served',
            formula: 'Total Budget ÷ (Direct Beneficiaries × Project Months)',
          });

          // 4. Leverage Ratio (if leveraged funds available)
          if (leveragedFunds !== undefined && leveragedFunds > 0) {
            const leverageRatio = (totalBudget + leveragedFunds) / totalBudget;
            const leveragePercent = (leveragedFunds / totalBudget) * 100;
            metrics.push({
              name: 'Leverage Ratio',
              value: leverageRatio,
              formatted: `${leverageRatio.toFixed(2)}:1`,
              interpretation: `For every $1 of grant funding, $${leverageRatio.toFixed(2)} total is invested`,
              additionalInfo: `${leveragePercent.toFixed(0)}% additional funds leveraged`,
              formula: '(Grant + Leveraged Funds) ÷ Grant Amount',
            });
          }

          // 5. Return on Investment (ROI) - if leveraged funds available
          if (leveragedFunds !== undefined && leveragedFunds > 0) {
            const roi = ((leveragedFunds + totalBudget - totalBudget) / totalBudget) * 100;
            metrics.push({
              name: 'Financial ROI',
              value: roi,
              formatted: `${roi.toFixed(1)}%`,
              interpretation: getROIInterpretation(roi),
              formula: '((Total Investment - Grant) ÷ Grant) × 100',
            });
          }

          // 6. Volunteer Value Added (if volunteer hours available)
          if (volunteerHours !== undefined && volunteerHours > 0) {
            const volunteerValue = volunteerHours * (volunteerHourlyValue || 29.95);
            const totalWithVolunteers = totalBudget + leveragedFunds! + volunteerValue;
            const volunteerLeverageRatio = volunteerValue / totalBudget;

            metrics.push({
              name: 'In-Kind Volunteer Contribution',
              value: volunteerValue,
              formatted: `$${volunteerValue.toLocaleString()}`,
              interpretation: `${volunteerHours.toLocaleString()} volunteer hours valued at $${volunteerHourlyValue}/hour`,
              additionalInfo: `Volunteer leverage ratio: ${volunteerLeverageRatio.toFixed(2)}:1`,
              formula: `Volunteer Hours × $${volunteerHourlyValue}/hour`,
            });

            metrics.push({
              name: 'Total Investment (with volunteers)',
              value: totalWithVolunteers,
              formatted: `$${totalWithVolunteers.toLocaleString()}`,
              interpretation: 'Grant + Leveraged Funds + Volunteer Value',
            });
          }

          // 7. Program Efficiency Ratio
          // Assuming 15% typical overhead/admin costs
          const assumedProgramCosts = totalBudget * 0.85;
          const efficiencyRatio = (assumedProgramCosts / totalBudget) * 100;
          metrics.push({
            name: 'Program Efficiency Ratio',
            value: efficiencyRatio,
            formatted: `${efficiencyRatio.toFixed(1)}%`,
            interpretation: 'Percentage of budget directly supporting programs (assumed 85%)',
            note: 'Update with actual program vs. administrative cost breakdown',
            formula: '(Program Costs ÷ Total Budget) × 100',
          });

          // 8. Outcome-based metrics (if outcomes provided)
          const outcomeMetrics: any[] = [];
          if (outcomes && outcomes.length > 0) {
            for (const outcome of outcomes) {
              const costPerOutcome = totalBudget / outcome.target;
              outcomeMetrics.push({
                outcome: outcome.metric,
                target: outcome.target,
                unit: outcome.unit,
                timeframe: outcome.timeframe || 'Project duration',
                costPerUnit: costPerOutcome,
                formatted: `$${costPerOutcome.toFixed(2)} per ${outcome.unit}`,
              });
            }
          }

          // Generate summary statistics
          const summary = {
            projectName,
            totalBudget: `$${totalBudget.toLocaleString()}`,
            projectDuration: `${projectDuration} months`,
            directBeneficiaries: beneficiaries.direct.toLocaleString(),
            indirectBeneficiaries: beneficiaries.indirect?.toLocaleString() || 'Not specified',
            totalInvestment: leveragedFunds
              ? `$${(totalBudget + leveragedFunds).toLocaleString()}`
              : `$${totalBudget.toLocaleString()}`,
          };

          // Generate comparison benchmarks
          const benchmarks = generateBenchmarks(costPerDirectBeneficiary, beneficiaries.demographic);

          // Generate recommendations
          const recommendations: string[] = [];
          recommendations.push(
            '💡 Include these metrics in your Budget Justification and Evaluation sections'
          );
          recommendations.push(
            '📊 Compare your cost per beneficiary to industry/sector benchmarks'
          );
          recommendations.push(
            '🎯 Highlight outcome-based metrics to demonstrate value for money'
          );

          if (leveragedFunds && leveragedFunds > 0) {
            recommendations.push(
              '💰 Emphasize leverage ratio to show how grant multiplies impact'
            );
          }

          if (volunteerHours && volunteerHours > 0) {
            recommendations.push(
              '🤝 Include in-kind volunteer contributions to strengthen sustainability narrative'
            );
          }

          if (costPerDirectBeneficiary < 100) {
            recommendations.push(
              '✓ Very low cost per beneficiary - highlight cost-effectiveness'
            );
          } else if (costPerDirectBeneficiary > 10000) {
            recommendations.push(
              '⚠ High cost per beneficiary - ensure you explain intensive service model'
            );
          }

          return {
            summary,
            coreMetrics: metrics,
            outcomeMetrics,
            benchmarks,
            recommendations,
            explanations: {
              costPerBeneficiary:
                'Shows the average cost to serve one person. Lower costs indicate efficiency, but intensive services may justify higher costs.',
              leverageRatio:
                'Demonstrates how grant funds attract additional resources. Ratios above 2:1 are considered strong.',
              roi: 'Financial return on the grant investment. Positive ROI shows funds generate additional value.',
              programEfficiency:
                'Percentage of budget spent on programs vs. overhead. Most funders prefer 80%+.',
            },
          };
        } catch (e: any) {
          return toolError('Impact Metrics Calculation Failed', e.message);
        }
      },
    }
  );
};

/**
 * Get interpretation for cost per beneficiary
 */
function getCostPerBeneficiaryInterpretation(cost: number): string {
  if (cost < 100) {
    return 'Excellent - Very cost-effective program with broad reach';
  } else if (cost < 500) {
    return 'Good - Efficient service delivery model';
  } else if (cost < 2000) {
    return 'Moderate - Typical for comprehensive programs';
  } else if (cost < 10000) {
    return 'Higher cost - May indicate intensive/specialized services';
  } else {
    return 'Very high - Ensure strong justification for intensive service model';
  }
}

/**
 * Get interpretation for ROI
 */
function getROIInterpretation(roi: number): string {
  if (roi < 0) {
    return 'Negative ROI - No additional funds leveraged';
  } else if (roi < 50) {
    return 'Moderate ROI - Some additional resources attracted';
  } else if (roi < 100) {
    return 'Good ROI - Grant doubles total investment';
  } else if (roi < 200) {
    return 'Strong ROI - Grant triples total investment';
  } else {
    return 'Excellent ROI - Grant attracts significant additional resources';
  }
}

/**
 * Generate industry benchmarks
 */
function generateBenchmarks(costPerBeneficiary: number, demographic?: string): any {
  const benchmarks = {
    yourCost: `$${costPerBeneficiary.toFixed(2)}`,
    sector: demographic || 'general',
    comparisons: [] as any[],
  };

  // General benchmarks by program type
  benchmarks.comparisons.push({
    programType: 'Education/Tutoring',
    typicalCost: '$500-$2,000 per student',
    comparison: costPerBeneficiary < 2000 ? 'Below average' : 'Above average',
  });

  benchmarks.comparisons.push({
    programType: 'Food Security/Nutrition',
    typicalCost: '$50-$500 per person',
    comparison: costPerBeneficiary < 500 ? 'Below average' : 'Above average',
  });

  benchmarks.comparisons.push({
    programType: 'Healthcare Services',
    typicalCost: '$1,000-$10,000 per patient',
    comparison: costPerBeneficiary < 10000 ? 'Below average' : 'Above average',
  });

  benchmarks.comparisons.push({
    programType: 'Workforce Development',
    typicalCost: '$2,000-$8,000 per participant',
    comparison: costPerBeneficiary < 8000 ? 'Below average' : 'Above average',
  });

  benchmarks.note =
    'These are general industry ranges. Compare to specific programs in your sector for accuracy.';

  return benchmarks;
}
