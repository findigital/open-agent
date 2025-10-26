import Exa from 'exa-js';
import { z } from 'zod';

import { Config } from '../../../base';
import { toolError } from './error';
import { createTool } from './utils';

/**
 * Search federal grant opportunities from grants.gov
 * Uses Exa to search the grants.gov site for relevant opportunities
 */
export const createGrantsGovSearchTool = (config: Config) => {
  return createTool(
    { toolName: 'grants_gov_search' },
    {
      description: `Search federal grant opportunities from grants.gov database. Returns real federal grants with current deadlines and requirements.

Use this when you need to:
- Find federal funding opportunities
- Research government grants
- Get official RFP documents
- Check federal grant eligibility

Returns: Array of grant opportunities with title, agency, amount, deadline, eligibility, and URL.`,
      inputSchema: z.object({
        keywords: z
          .array(z.string())
          .describe('Keywords to search (e.g., ["education", "STEM", "K-12"])'),
        category: z
          .string()
          .optional()
          .describe('Grant category filter (e.g., "Education", "Health", "Environment")'),
        minAmount: z.number().optional().describe('Minimum grant amount in USD'),
        maxAmount: z.number().optional().describe('Maximum grant amount in USD'),
        limit: z.number().default(10).describe('Number of results to return (default 10)'),
      }),
      execute: async ({ keywords, category, minAmount, maxAmount, limit }) => {
        try {
          const { key } = config.copilot.exa;
          if (!key) {
            return toolError('Grants.gov Search Failed', 'Exa API key not configured');
          }

          const exa = new Exa(key);

          // Build search query
          let query = `site:grants.gov ${keywords.join(' ')}`;
          if (category) {
            query += ` ${category}`;
          }
          if (minAmount || maxAmount) {
            query += ' funding';
          }

          // Search grants.gov via Exa
          const result = await exa.searchAndContents(query, {
            numResults: limit || 10,
            summary: true,
            livecrawl: 'fallback', // Use live crawl for freshest data
            startPublishedDate: getRecentDate(90), // Last 90 days
          });

          // Parse and format results
          const grants = result.results.map(r => {
            const amount = extractAmount(r.summary || '');
            const deadline = extractDeadline(r.summary || '');

            // Filter by amount if specified
            if (minAmount && amount.max && amount.max < minAmount) {
              return null;
            }
            if (maxAmount && amount.min && amount.min > maxAmount) {
              return null;
            }

            return {
              id: extractGrantId(r.url),
              title: r.title,
              agency: extractAgency(r.url, r.title),
              description: r.summary || r.text?.substring(0, 500),
              category: category || extractCategory(r.title, r.summary || ''),
              amountMin: amount.min,
              amountMax: amount.max,
              deadline: deadline,
              publishedDate: r.publishedDate,
              eligibility: extractEligibility(r.summary || ''),
              url: r.url,
              source: 'grants.gov',
            };
          }).filter(Boolean); // Remove nulls from amount filtering

          return {
            total: grants.length,
            grants,
            searchQuery: query,
          };
        } catch (e: any) {
          return toolError('Grants.gov Search Failed', e.message);
        }
      },
    }
  );
};

/**
 * Helper functions
 */

function getRecentDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function extractGrantId(url: string): string {
  // Try to extract opportunity ID from URL
  const match = url.match(/opportunityId[=\/](\d+)/i);
  if (match) return match[1];

  // Fallback to hash of URL
  return Buffer.from(url).toString('base64').substring(0, 16);
}

function extractAgency(url: string, title: string): string {
  // Common federal agencies
  const agencies = [
    'NSF', 'NIH', 'DOE', 'DOD', 'ED', 'HHS', 'USDA', 'DOC', 'DOJ', 'DOL',
    'National Science Foundation',
    'National Institutes of Health',
    'Department of Education',
    'Department of Energy',
    'Department of Defense',
  ];

  const text = `${url} ${title}`.toUpperCase();
  for (const agency of agencies) {
    if (text.includes(agency.toUpperCase())) {
      return agency;
    }
  }

  return 'Federal Government';
}

function extractCategory(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();

  const categories = {
    education: ['education', 'school', 'student', 'learning', 'stem', 'scholarship', 'university'],
    health: ['health', 'medical', 'wellness', 'healthcare', 'mental health', 'hospital', 'clinic'],
    arts: ['arts', 'culture', 'museum', 'music', 'theater', 'humanities'],
    environment: ['environment', 'climate', 'conservation', 'sustainability', 'clean energy', 'renewable'],
    technology: ['technology', 'innovation', 'research', 'development', 'science', 'engineering'],
    social: ['social', 'community', 'housing', 'poverty', 'inequality', 'justice'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'general';
}

function extractAmount(text: string): { min: number | null; max: number | null } {
  // Look for dollar amounts
  const amounts = text.match(/\$[\d,]+(?:,\d{3})*(?:\.\d{2})?/g);
  if (!amounts || amounts.length === 0) {
    return { min: null, max: null };
  }

  const numbers = amounts.map(a => {
    const cleaned = a.replace(/[$,]/g, '');
    return parseFloat(cleaned);
  });

  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

function extractDeadline(text: string): string | null {
  // Look for deadline patterns
  const patterns = [
    /deadline[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
    /due[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
    /close[sd]?[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function extractEligibility(text: string): string {
  // Extract eligibility criteria
  const patterns = [
    /eligible[:\s]+([^.]+)/i,
    /eligibility[:\s]+([^.]+)/i,
    /applicants?[:\s]+([^.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}
