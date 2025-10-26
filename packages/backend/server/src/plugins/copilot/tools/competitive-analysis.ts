import Exa from 'exa-js';
import { z } from 'zod';

import { Config } from '../../../base';
import { CopilotProviderFactory } from '../providers';
import { toolError } from './error';
import { createTool } from './utils';

/**
 * Analyze competitive landscape and winning proposal patterns
 * Uses Exa to find awarded grants and AI to analyze success patterns
 */
export const createCompetitiveAnalysisTool = (
  config: Config,
  providerFactory: CopilotProviderFactory
) => {
  return createTool(
    { toolName: 'competitive_analysis' },
    {
      description: `Analyze competitive landscape and identify patterns in successful grant proposals.

Use this when you need to:
- Understand what makes proposals successful
- Identify competitive advantages
- Learn from winning strategies
- Benchmark against successful applicants

Returns: Analysis of winning proposals with common themes, success factors, and recommendations.`,
      inputSchema: z.object({
        funderName: z.string().describe('Name of the funder or foundation'),
        grantCategory: z
          .string()
          .describe('Grant category or focus area (e.g., "education", "health", "arts")'),
        yearsSince: z
          .number()
          .default(3)
          .describe('Analyze grants from last N years (default 3)'),
      }),
      execute: async ({ funderName, grantCategory, yearsSince }) => {
        try {
          const { key } = config.copilot.exa;
          if (!key) {
            return toolError(
              'Competitive Analysis Failed',
              'Exa API key not configured'
            );
          }

          const exa = new Exa(key);
          const currentYear = new Date().getFullYear();
          const sinceYear = currentYear - (yearsSince || 3);

          // Search for awarded grants and success stories
          const searchQuery = `${funderName} ${grantCategory} awarded grants recipients success stories ${sinceYear}-${currentYear}`;

          const results = await exa.searchAndContents(searchQuery, {
            numResults: 20,
            summary: true,
            livecrawl: 'fallback',
          });

          if (results.results.length === 0) {
            return {
              funder: funderName,
              category: grantCategory,
              analysisDate: new Date().toISOString(),
              awardsFound: 0,
              message: 'No recent awards found for analysis',
            };
          }

          // Extract award information
          const awards = results.results.map(r => ({
            title: r.title,
            summary: r.summary || r.text?.substring(0, 500),
            url: r.url,
            grantee: extractOrganization(r.title, r.summary || ''),
            amount: extractAmount(r.summary || ''),
            projectType: extractProjectType(r.title, r.summary || ''),
          }));

          // Use AI to analyze patterns
          const provider = await providerFactory.getProviderByType('anthropic');
          if (!provider || !('text' in provider)) {
            // Fallback to simple analysis if AI not available
            return {
              funder: funderName,
              category: grantCategory,
              awardsFound: awards.length,
              awards: awards.slice(0, 10),
              note: 'AI analysis unavailable - showing raw results',
            };
          }

          const analysisPrompt = `Analyze these successful grant proposals and identify patterns:

Funder: ${funderName}
Category: ${grantCategory}

Awarded Grants (${awards.length} found):
${awards.map((a, i) => `
${i + 1}. ${a.title}
   Grantee: ${a.grantee || 'Unknown'}
   Amount: ${a.amount?.display || 'Not specified'}
   Type: ${a.projectType || 'General'}
   Summary: ${a.summary}
`).join('\n')}

Provide analysis as JSON:
{
  "commonThemes": ["theme 1", "theme 2", "theme 3"],
  "successFactors": ["factor 1", "factor 2", "factor 3"],
  "organizationTypes": ["type 1", "type 2"],
  "averageBudget": estimated_number,
  "projectDuration": "typical duration",
  "geographicFocus": ["location 1", "location 2"],
  "innovativeApproaches": ["approach 1", "approach 2"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`;

          const analysis = await provider.text(
            { modelId: 'claude-sonnet-4@20250514' },
            [{ role: 'user', content: analysisPrompt }],
            { signal: undefined }
          );

          // Parse AI response
          let parsedAnalysis;
          try {
            parsedAnalysis = JSON.parse(analysis);
          } catch {
            // Fallback if JSON parsing fails
            parsedAnalysis = {
              commonThemes: [],
              successFactors: [],
              recommendations: [],
              note: 'AI analysis could not be parsed',
            };
          }

          return {
            funder: funderName,
            category: grantCategory,
            analysisDate: new Date().toISOString(),
            yearsCovered: yearsSince,
            awardsAnalyzed: awards.length,

            patterns: parsedAnalysis,

            sampleAwards: awards.slice(0, 5).map(a => ({
              title: a.title,
              grantee: a.grantee,
              amount: a.amount?.display,
              url: a.url,
            })),
          };
        } catch (e: any) {
          return toolError('Competitive Analysis Failed', e.message);
        }
      },
    }
  );
};

/**
 * Helper functions
 */

function extractOrganization(title: string, summary: string): string | null {
  const text = `${title} ${summary}`;

  const patterns = [
    /awarded to ([^,\.]+)/i,
    /recipient[:\s]+([^,\.]+)/i,
    /grantee[:\s]+([^,\.]+)/i,
    /([A-Z][a-z]+ (?:University|College|Foundation|Institute|Center))/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function extractAmount(text: string): { amount: number | null; display: string | null } {
  const match = text.match(/\$[\d,]+(?:,\d{3})*(?:\.\d{2})?/);
  if (match) {
    const cleaned = match[0].replace(/[$,]/g, '');
    return {
      amount: parseFloat(cleaned),
      display: match[0],
    };
  }
  return { amount: null, display: null };
}

function extractProjectType(title: string, summary: string): string | null {
  const text = `${title} ${summary}`.toLowerCase();

  const types = {
    'Research': ['research', 'study', 'investigation', 'analysis'],
    'Program Development': ['program', 'initiative', 'project', 'development'],
    'Capacity Building': ['capacity', 'training', 'infrastructure', 'systems'],
    'Direct Service': ['service', 'delivery', 'implementation', 'provision'],
    'Pilot/Innovation': ['pilot', 'innovation', 'experimental', 'new approach'],
    'Capital': ['capital', 'building', 'construction', 'facility', 'equipment'],
  };

  for (const [type, keywords] of Object.entries(types)) {
    if (keywords.some(kw => text.includes(kw))) {
      return type;
    }
  }

  return null;
}
