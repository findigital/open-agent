import { z } from 'zod';

import { Config } from '../../../base';
import { CopilotProviderFactory } from '../providers';
import { toolError } from './error';
import { createTool } from './utils';

/**
 * Analyze proposal quality and provide scoring with recommendations
 * Uses AI to evaluate proposal against grant writing best practices
 */
export const createProposalAnalyzerTool = (
  config: Config,
  providerFactory: CopilotProviderFactory
) => {
  return createTool(
    { toolName: 'proposal_analyzer' },
    {
      description: `Analyze grant proposal quality and provide detailed scoring with recommendations.

Use this when you need to:
- Score proposal sections for quality
- Identify gaps or weaknesses
- Get improvement recommendations
- Check alignment with grant requirements
- Evaluate overall competitiveness

Returns: Detailed quality scores, strengths, weaknesses, and actionable recommendations.`,
      inputSchema: z.object({
        proposalSections: z.object({
          executiveSummary: z
            .string()
            .optional()
            .describe('Executive summary or abstract'),
          needStatement: z.string().optional().describe('Statement of need'),
          goals: z.string().optional().describe('Goals and objectives'),
          methods: z.string().optional().describe('Methods or approach'),
          evaluation: z.string().optional().describe('Evaluation plan'),
          sustainability: z
            .string()
            .optional()
            .describe('Sustainability plan'),
          budget: z.string().optional().describe('Budget and justification'),
          qualifications: z
            .string()
            .optional()
            .describe('Organizational qualifications'),
        }),
        grantRequirements: z
          .object({
            focusArea: z.string().optional().describe('Grant focus area'),
            priorities: z
              .array(z.string())
              .optional()
              .describe('Funder priorities'),
            requiredSections: z
              .array(z.string())
              .optional()
              .describe('Required proposal sections'),
          })
          .optional()
          .describe('Grant-specific requirements to check against'),
        analysisDepth: z
          .enum(['quick', 'standard', 'comprehensive'])
          .optional()
          .default('standard')
          .describe('Depth of analysis'),
      }),
      execute: async ({ proposalSections, grantRequirements, analysisDepth }) => {
        try {
          const provider = await providerFactory.getProviderByType('anthropic');
          if (!provider) {
            return toolError(
              'AI Provider Not Available',
              'Anthropic provider is required for proposal analysis'
            );
          }

          // Build analysis prompt
          const analysisPrompt = buildAnalysisPrompt(
            proposalSections,
            grantRequirements,
            analysisDepth || 'standard'
          );

          // Call AI to analyze proposal
          const analysisResponse = await provider.text(
            {
              modelId: 'claude-sonnet-4@20250514',
              config: {
                maxTokens: 4096,
                temperature: 0.3, // Lower temperature for consistent scoring
              },
            },
            [{ role: 'user', content: analysisPrompt }],
            { signal: undefined }
          );

          // Parse AI response (expecting JSON)
          let analysis: any;
          try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = analysisResponse.match(/```json\n([\s\S]*?)\n```/);
            const jsonText = jsonMatch ? jsonMatch[1] : analysisResponse;
            analysis = JSON.parse(jsonText);
          } catch (parseError) {
            // If JSON parsing fails, return raw text
            return {
              error: 'Failed to parse AI analysis response',
              rawResponse: analysisResponse,
              suggestion: 'Please try again or contact support',
            };
          }

          // Enhance analysis with additional metadata
          const providedSections = Object.keys(proposalSections).filter(
            key => proposalSections[key as keyof typeof proposalSections]
          );

          const enhancedAnalysis = {
            overallScore: analysis.overallScore || 0,
            overallGrade: getGradeForScore(analysis.overallScore || 0),
            competitivenessLevel: getCompetitivenessLevel(analysis.overallScore || 0),
            sectionsAnalyzed: providedSections.length,
            sectionsProvided: providedSections,
            sectionScores: analysis.sectionScores || {},
            strengths: analysis.strengths || [],
            weaknesses: analysis.weaknesses || [],
            gapAnalysis: analysis.gapAnalysis || [],
            recommendations: analysis.recommendations || [],
            priorityActions: analysis.priorityActions || [],
            estimatedReviewTime: analysis.estimatedReviewTime || '15-20 minutes',
            readabilityScore: analysis.readabilityScore || 'Not assessed',
            alignmentWithRequirements: analysis.alignmentWithRequirements || 'Not assessed',
          };

          // Add next steps based on score
          enhancedAnalysis.nextSteps = generateNextSteps(
            enhancedAnalysis.overallScore,
            enhancedAnalysis.weaknesses
          );

          return enhancedAnalysis;
        } catch (e: any) {
          return toolError('Proposal Analysis Failed', e.message);
        }
      },
    }
  );
};

/**
 * Build the analysis prompt for AI
 */
function buildAnalysisPrompt(
  sections: any,
  requirements: any,
  depth: string
): string {
  let prompt = `You are an expert grant proposal reviewer with 20+ years of experience evaluating proposals for major foundations and government agencies.

Analyze the following grant proposal sections and provide a detailed quality assessment.

## Proposal Sections to Analyze:

`;

  // Add each section that's provided
  const sectionLabels: Record<string, string> = {
    executiveSummary: 'Executive Summary',
    needStatement: 'Statement of Need',
    goals: 'Goals and Objectives',
    methods: 'Methods/Approach',
    evaluation: 'Evaluation Plan',
    sustainability: 'Sustainability Plan',
    budget: 'Budget and Justification',
    qualifications: 'Organizational Qualifications',
  };

  for (const [key, label] of Object.entries(sectionLabels)) {
    if (sections[key]) {
      prompt += `### ${label}\n${sections[key]}\n\n`;
    }
  }

  // Add requirements if provided
  if (requirements) {
    prompt += `## Grant Requirements to Check:\n`;
    if (requirements.focusArea) {
      prompt += `- Focus Area: ${requirements.focusArea}\n`;
    }
    if (requirements.priorities && requirements.priorities.length > 0) {
      prompt += `- Funder Priorities: ${requirements.priorities.join(', ')}\n`;
    }
    if (requirements.requiredSections && requirements.requiredSections.length > 0) {
      prompt += `- Required Sections: ${requirements.requiredSections.join(', ')}\n`;
    }
    prompt += '\n';
  }

  // Add analysis instructions based on depth
  prompt += `## Analysis Depth: ${depth}

Please analyze this proposal and provide your assessment in the following JSON format:

{
  "overallScore": <number 0-100>,
  "sectionScores": {
    "executiveSummary": <0-100>,
    "needStatement": <0-100>,
    "goals": <0-100>,
    "methods": <0-100>,
    "evaluation": <0-100>,
    "sustainability": <0-100>,
    "budget": <0-100>,
    "qualifications": <0-100>
  },
  "strengths": [
    "List 3-5 major strengths of this proposal"
  ],
  "weaknesses": [
    "List 3-5 major weaknesses or areas for improvement"
  ],
  "gapAnalysis": [
    "List any critical gaps or missing elements"
  ],
  "recommendations": [
    "List 5-7 specific, actionable recommendations for improvement"
  ],
  "priorityActions": [
    "List top 3 priority actions to take before submission"
  ],
  "readabilityScore": "<Excellent/Good/Fair/Poor>",
  "alignmentWithRequirements": "<Strong/Moderate/Weak alignment>",
  "estimatedReviewTime": "<estimated time for reviewer to read this>"
}

## Scoring Criteria:

- **90-100**: Exceptional - Ready for submission, highly competitive
- **80-89**: Strong - Minor revisions needed, competitive
- **70-79**: Good - Moderate revisions needed, moderately competitive
- **60-69**: Fair - Significant revisions needed
- **Below 60**: Weak - Major rework required

Evaluate based on:
1. **Clarity**: Is the writing clear, concise, and easy to understand?
2. **Evidence**: Are claims supported with data, research, and evidence?
3. **Logic**: Do the needs, goals, methods, and evaluation align logically?
4. **Feasibility**: Does the approach seem realistic and achievable?
5. **Impact**: Is the potential impact clearly articulated and significant?
6. **Innovation**: Does the proposal show innovative thinking?
7. **Sustainability**: Is there a clear plan for long-term sustainability?
8. **Qualifications**: Are organizational capabilities clearly demonstrated?

`;

  if (depth === 'comprehensive') {
    prompt += `
Additionally, provide:
- Detailed line-by-line critique of each section
- Specific language improvements
- Competitive positioning analysis
- Risk assessment
`;
  }

  prompt += `
Please provide your analysis in valid JSON format as specified above.`;

  return prompt;
}

/**
 * Get letter grade for score
 */
function getGradeForScore(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 87) return 'A-';
  if (score >= 83) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 77) return 'B-';
  if (score >= 73) return 'C+';
  if (score >= 70) return 'C';
  if (score >= 67) return 'C-';
  if (score >= 63) return 'D+';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Get competitiveness level
 */
function getCompetitivenessLevel(score: number): string {
  if (score >= 90) return 'Highly Competitive';
  if (score >= 80) return 'Competitive';
  if (score >= 70) return 'Moderately Competitive';
  if (score >= 60) return 'Needs Improvement';
  return 'Not Competitive';
}

/**
 * Generate next steps based on score
 */
function generateNextSteps(score: number, weaknesses: string[]): string[] {
  const steps: string[] = [];

  if (score >= 90) {
    steps.push('✓ Proposal is strong - perform final review for typos and formatting');
    steps.push('✓ Have a colleague do a fresh review');
    steps.push('✓ Ensure all attachments and required documents are ready');
    steps.push('✓ Submit well before the deadline');
  } else if (score >= 80) {
    steps.push('📝 Address the weaknesses identified above');
    steps.push('📊 Strengthen evidence and data where possible');
    steps.push('👥 Get feedback from a grant writing expert');
    steps.push('🔍 Do a final comprehensive review');
  } else if (score >= 70) {
    steps.push('⚠️ Significant revisions needed before submission');
    steps.push('📝 Focus on priority actions listed above');
    steps.push('💡 Consider bringing in a grant consultant');
    steps.push('📅 Allow 1-2 weeks for revisions');
  } else {
    steps.push('🚨 Major rework required - proposal not ready for submission');
    steps.push('📋 Start with the priority actions above');
    steps.push('👥 Engage professional grant writing support');
    steps.push('📆 Ensure adequate time before deadline (3-4 weeks minimum)');
  }

  return steps;
}
