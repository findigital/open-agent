import { z } from 'zod';

import { Config } from '../../../base';
import { PrismaService } from '../../../base/prisma/prisma.service';
import { toolError } from './error';
import { createTool } from './utils';

/**
 * Check organization eligibility for grant opportunities
 * Validates organization characteristics against grant requirements
 */
export const createGrantEligibilityCheckTool = (
  config: Config,
  prisma: PrismaService
) => {
  return createTool(
    { toolName: 'grant_eligibility_check' },
    {
      description: `Check if your organization is eligible for a specific grant opportunity.

Use this when you need to:
- Verify eligibility before investing time in proposal
- Check organization type requirements
- Validate budget size requirements
- Confirm geographic eligibility
- Check program area alignment

Returns: Eligibility status with detailed analysis and recommendations.`,
      inputSchema: z.object({
        organizationId: z.string().describe('Organization ID to check'),
        grantRequirements: z.object({
          organizationTypes: z
            .array(z.string())
            .optional()
            .describe('Allowed organization types (e.g., ["nonprofit", "501c3"])'),
          minAnnualBudget: z
            .number()
            .optional()
            .describe('Minimum annual budget required'),
          maxAnnualBudget: z
            .number()
            .optional()
            .describe('Maximum annual budget allowed'),
          requiredGeographicScope: z
            .array(z.string())
            .optional()
            .describe('Required geographic areas (e.g., ["California", "Los Angeles"])'),
          requiredFocusAreas: z
            .array(z.string())
            .optional()
            .describe('Required focus areas or program areas'),
          minYearsInOperation: z
            .number()
            .optional()
            .describe('Minimum years organization must be in operation'),
          requiresAuditedFinancials: z
            .boolean()
            .optional()
            .describe('Whether grant requires audited financial statements'),
          excludedOrganizations: z
            .array(z.string())
            .optional()
            .describe('Organizations excluded from applying'),
        }),
      }),
      execute: async ({ organizationId, grantRequirements }, context) => {
        try {
          // Fetch organization data
          const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
              context: true,
              documents: {
                where: {
                  type: {
                    in: ['financial_statement', 'audit', '990'],
                  },
                },
              },
            },
          });

          if (!org) {
            return toolError('Organization Not Found', `Organization ${organizationId} not found`);
          }

          const eligibilityChecks: any[] = [];
          let isEligible = true;

          // 1. Check organization type
          if (grantRequirements.organizationTypes && grantRequirements.organizationTypes.length > 0) {
            const orgType = org.type.toLowerCase();
            const allowedTypes = grantRequirements.organizationTypes.map(t => t.toLowerCase());
            const typeEligible = allowedTypes.some(type => orgType.includes(type));

            eligibilityChecks.push({
              criterion: 'Organization Type',
              required: grantRequirements.organizationTypes.join(', '),
              actual: org.type,
              eligible: typeEligible,
              severity: typeEligible ? 'pass' : 'fail',
            });

            if (!typeEligible) {
              isEligible = false;
            }
          }

          // 2. Check annual budget
          if (org.context?.annualBudget) {
            const budgetStr = org.context.annualBudget;
            // Parse budget string (e.g., "$500000-$1000000" or "$750000")
            const budgetMatch = budgetStr.match(/\$?([\d,]+)/);
            const budgetAmount = budgetMatch
              ? parseInt(budgetMatch[1].replace(/,/g, ''))
              : null;

            if (budgetAmount) {
              // Check minimum budget
              if (grantRequirements.minAnnualBudget !== undefined) {
                const meetsMin = budgetAmount >= grantRequirements.minAnnualBudget;
                eligibilityChecks.push({
                  criterion: 'Minimum Annual Budget',
                  required: `$${grantRequirements.minAnnualBudget.toLocaleString()}`,
                  actual: `$${budgetAmount.toLocaleString()}`,
                  eligible: meetsMin,
                  severity: meetsMin ? 'pass' : 'fail',
                });

                if (!meetsMin) {
                  isEligible = false;
                }
              }

              // Check maximum budget
              if (grantRequirements.maxAnnualBudget !== undefined) {
                const meetsMax = budgetAmount <= grantRequirements.maxAnnualBudget;
                eligibilityChecks.push({
                  criterion: 'Maximum Annual Budget',
                  required: `$${grantRequirements.maxAnnualBudget.toLocaleString()}`,
                  actual: `$${budgetAmount.toLocaleString()}`,
                  eligible: meetsMax,
                  severity: meetsMax ? 'pass' : 'fail',
                });

                if (!meetsMax) {
                  isEligible = false;
                }
              }
            }
          } else {
            if (grantRequirements.minAnnualBudget || grantRequirements.maxAnnualBudget) {
              eligibilityChecks.push({
                criterion: 'Annual Budget',
                required: 'Budget information required',
                actual: 'Not provided in organization context',
                eligible: false,
                severity: 'warning',
                suggestion: 'Add annual budget information to organization context',
              });
            }
          }

          // 3. Check geographic scope
          if (grantRequirements.requiredGeographicScope && grantRequirements.requiredGeographicScope.length > 0) {
            const orgScope = org.context?.geographicScope?.toLowerCase() || '';
            const matchesGeography = grantRequirements.requiredGeographicScope.some(geo =>
              orgScope.includes(geo.toLowerCase())
            );

            eligibilityChecks.push({
              criterion: 'Geographic Scope',
              required: grantRequirements.requiredGeographicScope.join(' OR '),
              actual: org.context?.geographicScope || 'Not specified',
              eligible: matchesGeography,
              severity: matchesGeography ? 'pass' : 'fail',
            });

            if (!matchesGeography && org.context?.geographicScope) {
              isEligible = false;
            } else if (!org.context?.geographicScope) {
              // Can't determine - warning not failure
              eligibilityChecks[eligibilityChecks.length - 1].severity = 'warning';
              eligibilityChecks[eligibilityChecks.length - 1].suggestion =
                'Add geographic scope to organization context';
            }
          }

          // 4. Check focus areas
          if (grantRequirements.requiredFocusAreas && grantRequirements.requiredFocusAreas.length > 0) {
            const orgFocusAreas = org.context?.focusAreas?.map(f => f.toLowerCase()) || [];
            const matchesFocusArea = grantRequirements.requiredFocusAreas.some(reqArea =>
              orgFocusAreas.some(orgArea => orgArea.includes(reqArea.toLowerCase()))
            );

            eligibilityChecks.push({
              criterion: 'Focus Areas',
              required: grantRequirements.requiredFocusAreas.join(' OR '),
              actual: orgFocusAreas.join(', ') || 'None specified',
              eligible: matchesFocusArea,
              severity: matchesFocusArea ? 'pass' : 'fail',
            });

            if (!matchesFocusArea && orgFocusAreas.length > 0) {
              isEligible = false;
            } else if (orgFocusAreas.length === 0) {
              eligibilityChecks[eligibilityChecks.length - 1].severity = 'warning';
              eligibilityChecks[eligibilityChecks.length - 1].suggestion =
                'Add focus areas to organization context';
            }
          }

          // 5. Check years in operation
          if (grantRequirements.minYearsInOperation !== undefined && org.context?.yearFounded) {
            const currentYear = new Date().getFullYear();
            const yearsInOperation = currentYear - org.context.yearFounded;
            const meetsYears = yearsInOperation >= grantRequirements.minYearsInOperation;

            eligibilityChecks.push({
              criterion: 'Years in Operation',
              required: `${grantRequirements.minYearsInOperation} years`,
              actual: `${yearsInOperation} years (founded ${org.context.yearFounded})`,
              eligible: meetsYears,
              severity: meetsYears ? 'pass' : 'fail',
            });

            if (!meetsYears) {
              isEligible = false;
            }
          }

          // 6. Check for audited financials
          if (grantRequirements.requiresAuditedFinancials) {
            const hasAuditedFinancials = org.documents.some(
              doc => doc.type === 'audit' || doc.type === 'financial_statement'
            );

            eligibilityChecks.push({
              criterion: 'Audited Financial Statements',
              required: 'Required',
              actual: hasAuditedFinancials ? 'Available' : 'Not uploaded',
              eligible: hasAuditedFinancials,
              severity: hasAuditedFinancials ? 'pass' : 'warning',
              suggestion: hasAuditedFinancials
                ? undefined
                : 'Upload audited financial statements to organization documents',
            });
          }

          // 7. Check excluded organizations
          if (grantRequirements.excludedOrganizations && grantRequirements.excludedOrganizations.length > 0) {
            const orgName = org.name.toLowerCase();
            const isExcluded = grantRequirements.excludedOrganizations.some(excluded =>
              orgName.includes(excluded.toLowerCase())
            );

            if (isExcluded) {
              eligibilityChecks.push({
                criterion: 'Organization Exclusions',
                required: 'Not in excluded list',
                actual: 'Organization appears in excluded list',
                eligible: false,
                severity: 'fail',
              });

              isEligible = false;
            }
          }

          // Calculate eligibility score
          const totalChecks = eligibilityChecks.filter(
            c => c.severity === 'pass' || c.severity === 'fail'
          ).length;
          const passedChecks = eligibilityChecks.filter(c => c.severity === 'pass').length;
          const eligibilityScore = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

          // Generate recommendations
          const recommendations: string[] = [];
          const failedChecks = eligibilityChecks.filter(c => c.severity === 'fail');
          const warningChecks = eligibilityChecks.filter(c => c.severity === 'warning');

          if (isEligible) {
            recommendations.push('✓ Organization meets all eligibility requirements');
            recommendations.push('Proceed with proposal development');
          } else {
            recommendations.push('✗ Organization does not meet all eligibility requirements');
            failedChecks.forEach(check => {
              recommendations.push(
                `- Failed: ${check.criterion} (Required: ${check.required}, Actual: ${check.actual})`
              );
            });
          }

          if (warningChecks.length > 0) {
            recommendations.push('');
            recommendations.push('Warnings:');
            warningChecks.forEach(check => {
              if (check.suggestion) {
                recommendations.push(`- ${check.criterion}: ${check.suggestion}`);
              }
            });
          }

          return {
            eligible: isEligible,
            eligibilityScore: Math.round(eligibilityScore),
            organizationName: org.name,
            checksPerformed: eligibilityChecks.length,
            checksPassed: passedChecks,
            checksFailed: failedChecks.length,
            checksWithWarnings: warningChecks.length,
            detailedChecks: eligibilityChecks,
            recommendations,
            nextSteps: isEligible
              ? [
                  'Review grant guidelines in detail',
                  'Begin proposal development',
                  'Ensure all required documents are ready',
                ]
              : [
                  'Review failed eligibility criteria',
                  'Consider if criteria can be met before deadline',
                  'Look for alternative grant opportunities',
                  'Update organization profile if information is missing',
                ],
          };
        } catch (e: any) {
          return toolError('Eligibility Check Failed', e.message);
        }
      },
    }
  );
};
