import { z } from 'zod';
import Exa from 'exa-js';

import { Config } from '../../../base';
import { toolError } from './error';
import { createTool } from './utils';

/**
 * Find academic research and citations to support grant proposals
 * Uses Exa to search academic databases and research repositories
 */
export const createResearchCitationsTool = (config: Config) => {
  return createTool(
    { toolName: 'research_citations' },
    {
      description: `Find academic research, studies, and citations to support grant proposals.

Use this when you need to:
- Find peer-reviewed research on a topic
- Get statistics and data from academic sources
- Support claims with credible citations
- Find recent studies in a specific field
- Locate authoritative sources for background sections

Returns: Academic sources with titles, authors, publication info, summaries, and URLs.`,
      inputSchema: z.object({
        topic: z.string().describe('Research topic or question'),
        fieldOfStudy: z
          .string()
          .optional()
          .describe('Field of study (e.g., "education", "healthcare", "environmental science")'),
        yearsSince: z
          .number()
          .optional()
          .describe('Only include research from last N years (default: 5)'),
        includeGrayLiterature: z
          .boolean()
          .optional()
          .default(false)
          .describe('Include non-peer-reviewed sources like reports and white papers'),
        maxResults: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of citations to return'),
      }),
      execute: async ({
        topic,
        fieldOfStudy,
        yearsSince,
        includeGrayLiterature,
        maxResults,
      }) => {
        try {
          const key = config.copilot.exa.key;
          if (!key) {
            return toolError('Exa Not Configured', 'Exa API key is not configured');
          }

          const exa = new Exa(key);

          // Calculate start date for recency filter
          const getStartDate = (years: number): string => {
            const date = new Date();
            date.setFullYear(date.getFullYear() - years);
            return date.toISOString().split('T')[0];
          };

          const startDate = yearsSince ? getStartDate(yearsSince) : getStartDate(5);

          // Build search query with field context
          let searchQuery = topic;
          if (fieldOfStudy) {
            searchQuery = `${topic} ${fieldOfStudy}`;
          }

          // Define academic domains
          const academicDomains = [
            'scholar.google.com',
            'pubmed.ncbi.nlm.nih.gov',
            'arxiv.org',
            'jstor.org',
            'researchgate.net',
            'sciencedirect.com',
            'springer.com',
            'wiley.com',
            'nature.com',
            'plos.org',
            'ncbi.nlm.nih.gov',
            'nih.gov',
            'edu', // General .edu domains
          ];

          // Add gray literature sources if requested
          const grayLiteratureDomains = [
            'brookings.edu',
            'rand.org',
            'urban.org',
            'pewresearch.org',
            'census.gov',
            'cdc.gov',
            'who.int',
          ];

          const includeDomains = includeGrayLiterature
            ? [...academicDomains, ...grayLiteratureDomains]
            : academicDomains;

          // Search for academic sources
          const searchResults = await exa.searchAndContents(searchQuery, {
            numResults: maxResults || 10,
            summary: true,
            includeDomains,
            startPublishedDate: startDate,
            livecrawl: 'fallback',
            useAutoprompt: true,
          });

          if (!searchResults.results || searchResults.results.length === 0) {
            return {
              topic,
              fieldOfStudy,
              citationsFound: 0,
              citations: [],
              message: 'No academic sources found for this topic',
            };
          }

          // Parse and format citations
          const citations = searchResults.results.map((result, index) => {
            // Try to extract author and year from title or text
            const authorMatch = result.text?.match(/([A-Z][a-z]+,?\s+[A-Z]\.?\s*)+/);
            const yearMatch = result.text?.match(/\b(19|20)\d{2}\b/);

            // Determine source type based on domain
            let sourceType = 'academic';
            if (result.url.includes('pubmed') || result.url.includes('nih.gov')) {
              sourceType = 'medical';
            } else if (result.url.includes('arxiv')) {
              sourceType = 'preprint';
            } else if (
              grayLiteratureDomains.some(domain => result.url.includes(domain))
            ) {
              sourceType = 'gray literature';
            }

            return {
              rank: index + 1,
              title: result.title,
              authors: authorMatch ? authorMatch[0].trim() : 'Authors not identified',
              year: yearMatch ? parseInt(yearMatch[0]) : null,
              sourceType,
              summary: result.summary || result.text?.substring(0, 300) + '...',
              url: result.url,
              publishedDate: result.publishedDate,
              score: result.score,
            };
          });

          // Sort by relevance score
          citations.sort((a, b) => (b.score || 0) - (a.score || 0));

          // Generate citation statistics
          const stats = {
            totalCitations: citations.length,
            sourceTypes: citations.reduce(
              (acc, cit) => {
                acc[cit.sourceType] = (acc[cit.sourceType] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ),
            yearRange: {
              earliest: Math.min(...citations.map(c => c.year || 9999)),
              latest: Math.max(...citations.map(c => c.year || 0)),
            },
            averageRelevanceScore:
              citations.reduce((sum, c) => sum + (c.score || 0), 0) / citations.length,
          };

          // Generate formatted citations for different styles
          const formattedCitations = {
            apa: citations.map(cit => {
              const year = cit.year || 'n.d.';
              return `${cit.authors} (${year}). ${cit.title}. Retrieved from ${cit.url}`;
            }),
            mla: citations.map(cit => {
              return `${cit.authors} "${cit.title}." Web. ${cit.publishedDate || 'n.d.'} <${cit.url}>`;
            }),
            chicago: citations.map(cit => {
              const year = cit.year || 'n.d.';
              return `${cit.authors} "${cit.title}." Accessed ${new Date().toLocaleDateString()}. ${cit.url}.`;
            }),
          };

          return {
            topic,
            fieldOfStudy,
            searchPeriod: {
              startDate,
              endDate: new Date().toISOString().split('T')[0],
            },
            citationsFound: citations.length,
            citations,
            statistics: stats,
            formattedCitations,
            recommendations: [
              'Review abstracts carefully to ensure relevance to your specific project',
              'Verify that sources are peer-reviewed if required by the funder',
              'Use recent citations (last 5 years) for current best practices',
              'Include a mix of foundational and recent research',
              'Cross-reference statistics across multiple sources for accuracy',
            ],
          };
        } catch (e: any) {
          return toolError('Research Citation Search Failed', e.message);
        }
      },
    }
  );
};
