import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { SearchGrantsInput } from './dto/search-grants.input';
import { GrantOpportunity, Prisma } from '@prisma/client';

@Injectable()
export class GrantService {
  private readonly logger = new Logger(GrantService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Search grants in the database
   */
  async search(input: SearchGrantsInput): Promise<GrantOpportunity[]> {
    const where: Prisma.GrantOpportunityWhereInput = {};

    // Keyword search across multiple fields
    if (input.keywords && input.keywords.length > 0) {
      where.OR = input.keywords.flatMap((keyword) => [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { funderName: { contains: keyword, mode: 'insensitive' } },
        { keywords: { has: keyword } },
      ]);
    }

    // Category filter
    if (input.category && input.category.length > 0) {
      where.category = {
        hasSome: input.category,
      };
    }

    // Amount range filters
    if (input.minAmount !== undefined) {
      where.maxAmount = {
        gte: input.minAmount,
      };
    }

    if (input.maxAmount !== undefined) {
      where.minAmount = {
        lte: input.maxAmount,
      };
    }

    // Open grants only
    if (input.openOnly) {
      const now = new Date();
      where.AND = [
        {
          OR: [
            { openDate: { lte: now } },
            { openDate: null },
          ],
        },
        {
          OR: [
            { closeDate: { gte: now } },
            { closeDate: null },
          ],
        },
      ];
    }

    return this.prisma.grantOpportunity.findMany({
      where,
      take: input.limit || 20,
      skip: input.offset || 0,
      orderBy: [
        { closeDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Find grant by ID
   */
  async findOne(id: string): Promise<GrantOpportunity | null> {
    return this.prisma.grantOpportunity.findUnique({
      where: { id },
    });
  }

  /**
   * Find grants by external IDs
   */
  async findByExternalId(source: string, externalId: string): Promise<GrantOpportunity | null> {
    return this.prisma.grantOpportunity.findFirst({
      where: {
        source,
        externalId,
      },
    });
  }

  /**
   * Fetch grants from Grants.gov API
   * Note: Requires GRANTS_GOV_API_KEY environment variable
   */
  async fetchFromGrantsGov(keywords?: string[]): Promise<GrantOpportunity[]> {
    const apiKey = process.env.GRANTS_GOV_API_KEY;

    if (!apiKey) {
      this.logger.warn('GRANTS_GOV_API_KEY not configured, skipping Grants.gov fetch');
      return [];
    }

    try {
      // This is a placeholder implementation
      // In production, you would call the actual Grants.gov API
      // Example: https://www.grants.gov/web/grants/xml-extract.html

      this.logger.log('Fetching grants from Grants.gov API...');

      // TODO: Implement actual API call
      // const response = await fetch(`https://www.grants.gov/grantsws/rest/opportunities/search/`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ keywords }),
      // });

      return [];
    } catch (error) {
      this.logger.error('Failed to fetch from Grants.gov', error);
      return [];
    }
  }

  /**
   * Fetch grants from Foundation Directory API
   * Note: Requires FOUNDATION_DIRECTORY_API_KEY environment variable
   */
  async fetchFromFoundationDirectory(keywords?: string[]): Promise<GrantOpportunity[]> {
    const apiKey = process.env.FOUNDATION_DIRECTORY_API_KEY;

    if (!apiKey) {
      this.logger.warn('FOUNDATION_DIRECTORY_API_KEY not configured');
      return [];
    }

    try {
      this.logger.log('Fetching grants from Foundation Directory...');

      // TODO: Implement actual API call
      // Foundation Directory (Candid) API integration

      return [];
    } catch (error) {
      this.logger.error('Failed to fetch from Foundation Directory', error);
      return [];
    }
  }

  /**
   * Import/sync grant from external source
   */
  async importGrant(data: {
    externalId?: string;
    source: string;
    title: string;
    funderName: string;
    description: string;
    eligibility: string;
    category: string[];
    keywords: string[];
    minAmount?: number;
    maxAmount?: number;
    openDate?: Date;
    closeDate?: Date;
    url?: string;
  }): Promise<GrantOpportunity> {
    // Check if grant already exists
    if (data.externalId) {
      const existing = await this.findByExternalId(data.source, data.externalId);

      if (existing) {
        // Update existing grant
        return this.prisma.grantOpportunity.update({
          where: { id: existing.id },
          data: {
            title: data.title,
            description: data.description,
            eligibility: data.eligibility,
            category: data.category,
            keywords: data.keywords,
            minAmount: data.minAmount,
            maxAmount: data.maxAmount,
            openDate: data.openDate,
            closeDate: data.closeDate,
            url: data.url,
          },
        });
      }
    }

    // Create new grant
    return this.prisma.grantOpportunity.create({
      data: {
        externalId: data.externalId,
        source: data.source,
        title: data.title,
        funderName: data.funderName,
        description: data.description,
        eligibility: data.eligibility,
        category: data.category,
        keywords: data.keywords,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        openDate: data.openDate,
        closeDate: data.closeDate,
        url: data.url,
      },
    });
  }

  /**
   * Get recommended grants based on organization profile
   */
  async getRecommendations(organizationId: string, limit: number = 10): Promise<GrantOpportunity[]> {
    // TODO: Implement AI-powered recommendations based on:
    // 1. Organization mission and focus areas
    // 2. Previous successful proposals
    // 3. Organization documents (using RAG)
    // 4. Grant category matching

    // For now, return recent open grants
    const now = new Date();

    return this.prisma.grantOpportunity.findMany({
      where: {
        OR: [
          { openDate: { lte: now } },
          { openDate: null },
        ],
        AND: [
          {
            OR: [
              { closeDate: { gte: now } },
              { closeDate: null },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { closeDate: 'asc' },
    });
  }

  /**
   * Sync grants from all configured sources
   */
  async syncAllSources(): Promise<{ imported: number; updated: number }> {
    this.logger.log('Starting grant sync from all sources...');

    let imported = 0;
    let updated = 0;

    try {
      // Fetch from Grants.gov
      const grantsGovData = await this.fetchFromGrantsGov();

      for (const grant of grantsGovData) {
        const result = await this.importGrant(grant as any);
        if (result) {
          imported++;
        }
      }

      // Fetch from Foundation Directory
      const foundationData = await this.fetchFromFoundationDirectory();

      for (const grant of foundationData) {
        const result = await this.importGrant(grant as any);
        if (result) {
          imported++;
        }
      }

      this.logger.log(`Grant sync complete: ${imported} imported, ${updated} updated`);
    } catch (error) {
      this.logger.error('Failed to sync grants', error);
    }

    return { imported, updated };
  }

  /**
   * Get grant statistics
   */
  async getStats(): Promise<{
    total: number;
    open: number;
    byCategory: Record<string, number>;
    bySo: Record<string, number>;
  }> {
    const now = new Date();

    const [total, open, allGrants] = await Promise.all([
      this.prisma.grantOpportunity.count(),
      this.prisma.grantOpportunity.count({
        where: {
          OR: [
            { openDate: { lte: now } },
            { openDate: null },
          ],
          AND: [
            {
              OR: [
                { closeDate: { gte: now } },
                { closeDate: null },
              ],
            },
          ],
        },
      }),
      this.prisma.grantOpportunity.findMany({
        select: {
          category: true,
          source: true,
        },
      }),
    ]);

    // Count by category
    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const grant of allGrants) {
      // Count categories
      for (const cat of grant.category) {
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      }

      // Count sources
      bySource[grant.source] = (bySource[grant.source] || 0) + 1;
    }

    return {
      total,
      open,
      byCategory,
      bySo: bySource,
    };
  }
}
