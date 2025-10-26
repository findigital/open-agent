import Exa from 'exa-js';
import { z } from 'zod';

import { Config } from '../../../base';
import { toolError } from './error';
import { createTool } from './utils';

/**
 * Research foundation or funder background, priorities, and giving patterns
 * Uses Exa to gather comprehensive intelligence about funders
 */
export const createFunderResearchTool = (config: Config) => {
  return createTool(
    { toolName: 'funder_research' },
    {
      description: `Research foundation or funder background, priorities, giving patterns, and recent awards.

Use this when you need to:
- Understand funder priorities and mission
- Learn about recent grant awards
- Identify decision-maker preferences
- Tailor proposals to funder interests

Returns: Comprehensive funder profile with priorities, recent awards, leadership, and insights.`,
      inputSchema: z.object({
        funderName: z.string().describe('Name of the funder or foundation'),
        yearsSince: z
          .number()
          .default(3)
          .describe('Look back N years for recent awards (default 3)'),
        includeLeadership: z
          .boolean()
          .default(true)
          .describe('Include board/leadership information'),
      }),
      execute: async ({ funderName, yearsSince, includeLeadership }) => {
        try {
          const { key } = config.copilot.exa;
          if (!key) {
            return toolError('Funder Research Failed', 'Exa API key not configured');
          }

          const exa = new Exa(key);
          const currentYear = new Date().getFullYear();
          const sinceYear = currentYear - (yearsSince || 3);

          // Run multiple searches in parallel for comprehensive research
          const [prioritiesResults, awardsResults, leadershipResults] = await Promise.all([
            // Search for priorities and mission
            exa.searchAndContents(
              `${funderName} foundation grant priorities mission focus areas strategic plan`,
              {
                numResults: 5,
                summary: true,
                livecrawl: 'fallback',
              }
            ),

            // Search for recent awards
            exa.searchAndContents(
              `${funderName} awarded grants recipients ${sinceYear} ${currentYear}`,
              {
                numResults: 10,
                summary: true,
              }
            ),

            // Search for leadership (if requested)
            includeLeadership
              ? exa.searchAndContents(
                  `${funderName} foundation board leadership directors staff`,
                  {
                    numResults: 3,
                    summary: true,
                  }
                )
              : Promise.resolve({ results: [] }),
          ]);

          // Extract and structure the research
          const priorities = prioritiesResults.results.map(r => ({
            title: r.title,
            summary: r.summary || r.text?.substring(0, 300),
            url: r.url,
            publishedDate: r.publishedDate,
          }));

          const recentAwards = awardsResults.results.map(r => ({
            title: r.title,
            summary: r.summary || r.text?.substring(0, 300),
            url: r.url,
            grantee: extractGrantee(r.title, r.summary || ''),
            amount: extractAmount(r.summary || ''),
          }));

          const leadership = includeLeadership
            ? leadershipResults.results.map(r => ({
                title: r.title,
                summary: r.summary || r.text?.substring(0, 300),
                url: r.url,
              }))
            : [];

          // Analyze giving patterns
          const givingPatterns = analyzeGivingPatterns(recentAwards);

          return {
            funder: funderName,
            researchDate: new Date().toISOString(),

            priorities: {
              total: priorities.length,
              items: priorities,
              keyThemes: extractKeyThemes(priorities),
            },

            recentAwards: {
              total: recentAwards.length,
              yearsCovered: yearsSince,
              items: recentAwards,
              patterns: givingPatterns,
            },

            leadership: includeLeadership
              ? {
                  total: leadership.length,
                  items: leadership,
                }
              : null,

            insights: generateInsights(priorities, recentAwards),
          };
        } catch (e: any) {
          return toolError('Funder Research Failed', e.message);
        }
      },
    }
  );
};

/**
 * Helper functions
 */

function extractGrantee(title: string, summary: string): string | null {
  const text = `${title} ${summary}`;

  // Look for common patterns
  const patterns = [
    /awarded to ([^,\.]+)/i,
    /grant to ([^,\.]+)/i,
    /recipient[:\s]+([^,\.]+)/i,
    /grantee[:\s]+([^,\.]+)/i,
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

function extractKeyThemes(priorities: any[]): string[] {
  const text = priorities
    .map(p => `${p.title} ${p.summary}`)
    .join(' ')
    .toLowerCase();

  const themes: Record<string, string[]> = {
    'K-12 Education': ['k-12', 'elementary', 'middle school', 'high school', 'secondary education'],
    'Higher Education': ['university', 'college', 'higher education', 'post-secondary'],
    'STEM': ['stem', 'science', 'technology', 'engineering', 'mathematics'],
    'Health & Wellness': ['health', 'wellness', 'medical', 'healthcare'],
    'Arts & Culture': ['arts', 'culture', 'museum', 'music', 'theater'],
    'Environment': ['environment', 'climate', 'conservation', 'sustainability'],
    'Social Justice': ['justice', 'equity', 'equality', 'civil rights'],
    'Economic Development': ['economic', 'workforce', 'employment', 'jobs'],
    'Community Development': ['community', 'neighborhood', 'housing'],
  };

  const foundThemes: string[] = [];
  for (const [theme, keywords] of Object.entries(themes)) {
    if (keywords.some(kw => text.includes(kw))) {
      foundThemes.push(theme);
    }
  }

  return foundThemes;
}

function analyzeGivingPatterns(awards: any[]): any {
  const amounts = awards
    .map(a => a.amount?.amount)
    .filter((a): a is number => a !== null);

  if (amounts.length === 0) {
    return {
      averageGrant: null,
      minGrant: null,
      maxGrant: null,
      totalAwarded: null,
    };
  }

  return {
    averageGrant: Math.round(amounts.reduce((sum, a) => sum + a, 0) / amounts.length),
    minGrant: Math.min(...amounts),
    maxGrant: Math.max(...amounts),
    totalAwarded: amounts.reduce((sum, a) => sum + a, 0),
    grantCount: amounts.length,
  };
}

function generateInsights(priorities: any[], awards: any[]): string[] {
  const insights: string[] = [];

  // Insight from priorities
  if (priorities.length > 0) {
    const themes = extractKeyThemes(priorities);
    if (themes.length > 0) {
      insights.push(`Primary focus areas: ${themes.slice(0, 3).join(', ')}`);
    }
  }

  // Insight from awards
  const patterns = analyzeGivingPatterns(awards);
  if (patterns.averageGrant) {
    insights.push(
      `Average grant size: $${patterns.averageGrant.toLocaleString()}`
    );
  }
  if (patterns.grantCount) {
    insights.push(`Awards ${patterns.grantCount} grants in recent period`);
  }

  // Geographic insights
  const locations = awards
    .map(a => extractLocation(a.title, a.summary))
    .filter(Boolean);
  if (locations.length > 0) {
    const topLocation = getMostCommon(locations);
    if (topLocation) {
      insights.push(`Geographic focus: ${topLocation}`);
    }
  }

  return insights;
}

function extractLocation(title: string, summary: string): string | null {
  const text = `${title} ${summary}`;

  // US States
  const states = [
    'California', 'New York', 'Texas', 'Florida', 'Illinois', 'Pennsylvania',
    'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'New Jersey', 'Virginia',
  ];

  for (const state of states) {
    if (text.includes(state)) {
      return state;
    }
  }

  return null;
}

function getMostCommon<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;

  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  let maxCount = 0;
  let mostCommon: T | null = null;
  for (const [item, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  }

  return mostCommon;
}
