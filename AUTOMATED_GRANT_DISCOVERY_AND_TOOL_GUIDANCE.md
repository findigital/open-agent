# Automated Grant Discovery & Tool Usage Guidance

**Date:** October 26, 2025
**Status:** Design & Implementation Plan

---

## Part 1: Automated Grant Discovery & Proposal Drafting

### Overview

Create an **intelligent grant monitoring system** that:
1. ✅ Searches well-known grant sites automatically
2. ✅ Matches opportunities to user profile (from onboarding)
3. ✅ Sends email alerts for relevant grants
4. ✅ Automatically begins drafting proposals
5. ✅ Uses organization context from onboarding and documents

---

## Architecture: Automated Grant Discovery System

```
┌─────────────────────────────────────────────────────────────────┐
│  Grant Discovery Pipeline                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Scheduled Monitoring (Daily/Weekly)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Grant Scanner Service                                    │  │
│  │  ├─ BullMQ scheduled job                                  │  │
│  │  ├─ Runs daily at 9 AM                                    │  │
│  │  └─ Per organization/user                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Step 2: Multi-Source Search                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Search Strategy (Parallel)                               │  │
│  │  ├─ Grants.gov (Federal)                                  │  │
│  │  ├─ Foundation Directory (Philanthropy)                   │  │
│  │  ├─ Community Foundations (Local)                         │  │
│  │  ├─ State/City Government Sites                           │  │
│  │  ├─ Corporate Giving Programs                             │  │
│  │  └─ Sector-Specific Sites (Education, Health, Arts)      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Step 3: Intelligent Matching                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Match Algorithm                                          │  │
│  │  ├─ Organization profile (mission, focus areas)          │  │
│  │  ├─ Budget size & eligibility                            │  │
│  │  ├─ Geographic scope                                      │  │
│  │  ├─ Historical success (learn from past wins)            │  │
│  │  └─ AI relevance scoring (0-100)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Step 4: Email Alerts                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Notification Service                                     │  │
│  │  ├─ Daily digest (9 AM)                                   │  │
│  │  ├─ Urgent alerts (deadline < 2 weeks)                   │  │
│  │  ├─ High-match opportunities (score > 80)                │  │
│  │  └─ Customizable frequency                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Step 5: Auto-Draft Proposal (Optional)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Proposal Generator                                       │  │
│  │  ├─ Scrape RFP from grant URL                            │  │
│  │  ├─ Extract requirements                                  │  │
│  │  ├─ Retrieve org context from onboarding                 │  │
│  │  ├─ Generate draft proposal sections                     │  │
│  │  └─ Save as draft in workspace                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation: Grant Discovery Service

### 1. Grant Scanner Service

```typescript
// packages/backend/server/src/modules/grant-discovery/grant-scanner.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../base/prisma/prisma.service';
import { GrantSourceService } from './grant-source.service';
import { GrantMatchingService } from './grant-matching.service';
import { GrantNotificationService } from './grant-notification.service';

@Injectable()
export class GrantScannerService {
  private readonly logger = new Logger(GrantScannerService.name);

  constructor(
    private prisma: PrismaService,
    private grantSource: GrantSourceService,
    private grantMatching: GrantMatchingService,
    private notifications: GrantNotificationService,
  ) {}

  /**
   * Run grant discovery daily at 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDailyDiscovery() {
    this.logger.log('Starting daily grant discovery scan...');

    // Get all organizations with discovery enabled
    const organizations = await this.prisma.organization.findMany({
      where: {
        settings: {
          path: ['grantDiscovery', 'enabled'],
          equals: true,
        },
      },
      include: {
        members: {
          where: {
            settings: {
              path: ['notifications', 'grantAlerts'],
              equals: true,
            },
          },
          include: { user: true },
        },
      },
    });

    this.logger.log(`Found ${organizations.length} organizations with discovery enabled`);

    // Process each organization
    for (const org of organizations) {
      try {
        await this.scanForOrganization(org);
      } catch (error) {
        this.logger.error(`Failed to scan for organization ${org.id}:`, error);
      }
    }

    this.logger.log('Daily grant discovery scan completed');
  }

  /**
   * Scan for grants for a specific organization
   */
  private async scanForOrganization(organization: any): Promise<void> {
    this.logger.log(`Scanning grants for: ${organization.name}`);

    // Build search criteria from organization profile
    const searchCriteria = {
      keywords: organization.focusAreas || [],
      geographicScope: organization.state,
      budgetRange: {
        min: organization.annualBudget * 0.05, // 5% of annual budget
        max: organization.annualBudget * 0.5,   // 50% of annual budget
      },
      organizationType: organization.type,
      categories: organization.programAreas || [],
    };

    // Search multiple sources in parallel
    const [
      federalGrants,
      foundationGrants,
      communityGrants,
      stateGrants,
    ] = await Promise.all([
      this.grantSource.searchGrantsGov(searchCriteria),
      this.grantSource.searchFoundationDirectory(searchCriteria),
      this.grantSource.searchCommunityFoundations(searchCriteria),
      this.grantSource.searchStateGrants(searchCriteria),
    ]);

    // Combine all results
    const allGrants = [
      ...federalGrants,
      ...foundationGrants,
      ...communityGrants,
      ...stateGrants,
    ];

    this.logger.log(`Found ${allGrants.length} potential grants for ${organization.name}`);

    // Match grants to organization profile
    const matchedGrants = await this.grantMatching.matchGrants(
      allGrants,
      organization
    );

    // Filter for high-quality matches (score > 60)
    const qualityMatches = matchedGrants.filter(g => g.matchScore > 60);

    this.logger.log(`${qualityMatches.length} high-quality matches for ${organization.name}`);

    // Save discovered grants to database
    for (const grant of qualityMatches) {
      await this.saveDiscoveredGrant(grant, organization.id);
    }

    // Send notifications to organization members
    if (qualityMatches.length > 0) {
      await this.notifications.sendGrantAlerts(
        organization,
        qualityMatches
      );
    }
  }

  /**
   * Save discovered grant to database
   */
  private async saveDiscoveredGrant(grant: any, organizationId: string): Promise<void> {
    // Check if already exists
    const existing = await this.prisma.grant.findFirst({
      where: {
        externalId: grant.id,
        source: grant.source,
      },
    });

    if (existing) {
      this.logger.debug(`Grant ${grant.id} already exists, skipping`);
      return;
    }

    // Create grant record
    await this.prisma.grant.create({
      data: {
        title: grant.title,
        funderName: grant.funder,
        description: grant.description,
        category: grant.category,
        minAmount: grant.amountMin,
        maxAmount: grant.amountMax,
        openDate: grant.openDate,
        closeDate: grant.closeDate,
        eligibility: grant.eligibility,
        url: grant.url,
        externalId: grant.id,
        source: grant.source,
        organizationId,
        metadata: {
          matchScore: grant.matchScore,
          matchReasons: grant.matchReasons,
          discoveredAt: new Date(),
        },
      },
    });
  }
}
```

---

### 2. Grant Source Service (Multi-Source Scraping)

```typescript
// packages/backend/server/src/modules/grant-discovery/grant-source.service.ts

import { Injectable, Logger } from '@nestjs/common';
import Exa from 'exa-js';
import { Config } from '../../base';

interface SearchCriteria {
  keywords: string[];
  geographicScope?: string;
  budgetRange?: { min: number; max: number };
  organizationType?: string;
  categories?: string[];
}

@Injectable()
export class GrantSourceService {
  private readonly logger = new Logger(GrantSourceService.name);
  private readonly exa: Exa;

  // Well-known grant sites
  private readonly GRANT_SITES = {
    federal: ['grants.gov'],
    foundation: [
      'foundationcenter.org',
      'candid.org',
      'cof.org',
    ],
    community: [
      // Major community foundations
      'cfgreateratlanta.org',
      'cfsv.org', // Silicon Valley
      'chicagocommunity trust.org',
      'nycommunitytrust.org',
      'seattlefoundation.org',
      'dccommunityfoundation.org',
      // More can be added per region
    ],
    state: [
      'arts.ca.gov', // California Arts Council
      'education.ny.gov', // NY Education
      // State-specific sites added dynamically based on org location
    ],
    corporate: [
      'corporate.target.com/corporate-responsibility',
      'walmart.org',
      'google.org',
      'amazonfund.org',
    ],
  };

  constructor(private config: Config) {
    this.exa = new Exa(config.copilot.exa.key);
  }

  /**
   * Search Grants.gov (Federal)
   */
  async searchGrantsGov(criteria: SearchCriteria): Promise<any[]> {
    this.logger.log('Searching Grants.gov...');

    try {
      const query = this.buildSearchQuery(criteria);

      const results = await this.exa.searchAndContents(
        `site:grants.gov ${query}`,
        {
          numResults: 20,
          summary: true,
          category: 'government',
          startPublishedDate: this.getRecentDate(30), // Last 30 days
        }
      );

      return results.results.map(r => ({
        id: this.extractGrantId(r.url),
        title: r.title,
        funder: 'Federal Government',
        description: r.summary,
        category: this.extractCategory(r.title, r.summary),
        amountMin: this.extractAmount(r.summary, 'min'),
        amountMax: this.extractAmount(r.summary, 'max'),
        openDate: r.publishedDate,
        closeDate: this.extractDeadline(r.summary),
        eligibility: this.extractEligibility(r.summary),
        url: r.url,
        source: 'grants.gov',
      }));
    } catch (error) {
      this.logger.error('Grants.gov search failed:', error);
      return [];
    }
  }

  /**
   * Search Foundation Directory
   */
  async searchFoundationDirectory(criteria: SearchCriteria): Promise<any[]> {
    this.logger.log('Searching foundation sites...');

    try {
      const query = this.buildSearchQuery(criteria);

      const results = await this.exa.searchAndContents(
        `(${this.GRANT_SITES.foundation.map(s => `site:${s}`).join(' OR ')}) ${query} grant opportunities`,
        {
          numResults: 15,
          summary: true,
          startPublishedDate: this.getRecentDate(60), // Last 60 days
        }
      );

      return results.results.map(r => ({
        id: this.generateGrantId(r.url),
        title: r.title,
        funder: this.extractFunder(r.url, r.title),
        description: r.summary,
        category: this.extractCategory(r.title, r.summary),
        amountMin: this.extractAmount(r.summary, 'min'),
        amountMax: this.extractAmount(r.summary, 'max'),
        openDate: r.publishedDate,
        closeDate: this.extractDeadline(r.summary),
        eligibility: this.extractEligibility(r.summary),
        url: r.url,
        source: 'foundation',
      }));
    } catch (error) {
      this.logger.error('Foundation search failed:', error);
      return [];
    }
  }

  /**
   * Search Community Foundations (Local)
   */
  async searchCommunityFoundations(criteria: SearchCriteria): Promise<any[]> {
    this.logger.log('Searching community foundations...');

    // Get community foundations for user's geographic area
    const localFoundations = this.getLocalCommunityFoundations(criteria.geographicScope);

    try {
      const query = this.buildSearchQuery(criteria);

      const results = await this.exa.searchAndContents(
        `(${localFoundations.map(s => `site:${s}`).join(' OR ')}) ${query} grant application RFP`,
        {
          numResults: 10,
          summary: true,
          startPublishedDate: this.getRecentDate(90), // Last 90 days
        }
      );

      return results.results.map(r => ({
        id: this.generateGrantId(r.url),
        title: r.title,
        funder: this.extractFunder(r.url, r.title),
        description: r.summary,
        category: this.extractCategory(r.title, r.summary),
        amountMin: this.extractAmount(r.summary, 'min'),
        amountMax: this.extractAmount(r.summary, 'max'),
        openDate: r.publishedDate,
        closeDate: this.extractDeadline(r.summary),
        eligibility: this.extractEligibility(r.summary),
        url: r.url,
        source: 'community_foundation',
        geographic: criteria.geographicScope,
      }));
    } catch (error) {
      this.logger.error('Community foundation search failed:', error);
      return [];
    }
  }

  /**
   * Search State/City Government Grants
   */
  async searchStateGrants(criteria: SearchCriteria): Promise<any[]> {
    this.logger.log('Searching state/city grants...');

    const stateQuery = criteria.geographicScope
      ? `${criteria.geographicScope} state government grants`
      : 'state government grants';

    try {
      const query = this.buildSearchQuery(criteria);

      const results = await this.exa.searchAndContents(
        `${stateQuery} ${query} application`,
        {
          numResults: 10,
          summary: true,
          category: 'government',
          startPublishedDate: this.getRecentDate(60),
        }
      );

      return results.results.map(r => ({
        id: this.generateGrantId(r.url),
        title: r.title,
        funder: this.extractFunder(r.url, r.title),
        description: r.summary,
        category: this.extractCategory(r.title, r.summary),
        amountMin: this.extractAmount(r.summary, 'min'),
        amountMax: this.extractAmount(r.summary, 'max'),
        openDate: r.publishedDate,
        closeDate: this.extractDeadline(r.summary),
        eligibility: this.extractEligibility(r.summary),
        url: r.url,
        source: 'state_government',
        geographic: criteria.geographicScope,
      }));
    } catch (error) {
      this.logger.error('State grant search failed:', error);
      return [];
    }
  }

  /**
   * Build search query from criteria
   */
  private buildSearchQuery(criteria: SearchCriteria): string {
    const parts: string[] = [];

    if (criteria.keywords.length > 0) {
      parts.push(criteria.keywords.join(' '));
    }

    if (criteria.categories && criteria.categories.length > 0) {
      parts.push(criteria.categories.join(' '));
    }

    return parts.join(' ') || 'nonprofit grant';
  }

  /**
   * Get local community foundations based on state
   */
  private getLocalCommunityFoundations(state?: string): string[] {
    if (!state) return this.GRANT_SITES.community;

    // Map states to major community foundations
    const stateFoundations: Record<string, string[]> = {
      CA: ['cfsv.org', 'sdcf.org', 'sffoundation.org'],
      NY: ['nycommunitytrust.org', 'rbf.org'],
      GA: ['cfgreateratlanta.org'],
      WA: ['seattlefoundation.org'],
      IL: ['chicagocommunity trust.org'],
      // Add more states...
    };

    return stateFoundations[state] || this.GRANT_SITES.community;
  }

  /**
   * Extract helpers
   */
  private extractGrantId(url: string): string {
    const match = url.match(/opportunityId=(\d+)/);
    return match ? match[1] : this.generateGrantId(url);
  }

  private generateGrantId(url: string): string {
    return Buffer.from(url).toString('base64').substring(0, 16);
  }

  private extractFunder(url: string, title: string): string {
    // Extract domain name as funder
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0];
  }

  private extractCategory(title: string, summary: string): string {
    const text = `${title} ${summary}`.toLowerCase();

    const categories = {
      education: ['education', 'school', 'student', 'learning', 'scholarship'],
      health: ['health', 'medical', 'wellness', 'healthcare', 'mental health'],
      arts: ['arts', 'culture', 'museum', 'music', 'theater'],
      environment: ['environment', 'climate', 'conservation', 'sustainability'],
      social: ['social', 'community', 'housing', 'poverty', 'inequality'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => text.includes(kw))) {
        return category;
      }
    }

    return 'general';
  }

  private extractAmount(text: string, type: 'min' | 'max'): number | null {
    // Look for dollar amounts
    const amounts = text.match(/\$[\d,]+/g);
    if (!amounts) return null;

    const numbers = amounts.map(a => parseInt(a.replace(/[$,]/g, '')));
    return type === 'min' ? Math.min(...numbers) : Math.max(...numbers);
  }

  private extractDeadline(text: string): Date | null {
    // Simple date extraction (can be improved)
    const datePattern = /deadline[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i;
    const match = text.match(datePattern);

    if (match) {
      try {
        return new Date(match[1]);
      } catch {
        return null;
      }
    }

    return null;
  }

  private extractEligibility(text: string): string {
    // Extract eligibility criteria
    const eligPattern = /eligible[:\s]+([^.]+)/i;
    const match = text.match(eligPattern);
    return match ? match[1].trim() : '';
  }

  private getRecentDate(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }
}
```

---

### 3. Grant Matching Service (AI-Powered)

```typescript
// packages/backend/server/src/modules/grant-discovery/grant-matching.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { CopilotProvider } from '../../plugins/copilot/providers';

@Injectable()
export class GrantMatchingService {
  private readonly logger = new Logger(GrantMatchingService.name);

  constructor(private copilot: CopilotProvider) {}

  /**
   * Match grants to organization profile using AI
   */
  async matchGrants(grants: any[], organization: any): Promise<any[]> {
    this.logger.log(`Matching ${grants.length} grants to ${organization.name}`);

    const matchedGrants = await Promise.all(
      grants.map(grant => this.scoreGrant(grant, organization))
    );

    // Sort by match score (highest first)
    return matchedGrants.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Score individual grant match using AI
   */
  private async scoreGrant(grant: any, organization: any): Promise<any> {
    try {
      const model = this.copilot.getModel('quick_decision_making');

      const result = await this.copilot.generateText({
        model,
        prompt: `Score this grant opportunity for the organization (0-100).

**Organization Profile:**
- Name: ${organization.name}
- Mission: ${organization.mission || 'Not provided'}
- Focus Areas: ${organization.focusAreas?.join(', ') || 'Not provided'}
- Budget: $${organization.annualBudget?.toLocaleString() || 'Unknown'}
- Location: ${organization.city}, ${organization.state}
- Type: ${organization.type}
- Program Areas: ${organization.programAreas?.join(', ') || 'Not provided'}

**Grant Opportunity:**
- Title: ${grant.title}
- Funder: ${grant.funder}
- Description: ${grant.description}
- Category: ${grant.category}
- Amount: $${grant.amountMin?.toLocaleString() || '?'} - $${grant.amountMax?.toLocaleString() || '?'}
- Eligibility: ${grant.eligibility || 'Not specified'}
- Geographic: ${grant.geographic || 'Not specified'}

Return JSON only:
{
  "matchScore": 0-100,
  "confidence": "high|medium|low",
  "matchReasons": ["reason 1", "reason 2", "reason 3"],
  "concerns": ["concern 1", "concern 2"],
  "recommendation": "apply|consider|skip"
}`,
        temperature: 0.3,
      });

      const analysis = JSON.parse(result.text);

      return {
        ...grant,
        matchScore: analysis.matchScore,
        matchConfidence: analysis.confidence,
        matchReasons: analysis.matchReasons,
        matchConcerns: analysis.concerns,
        recommendation: analysis.recommendation,
      };
    } catch (error) {
      this.logger.error(`Failed to score grant ${grant.id}:`, error);

      // Fallback to simple scoring
      return {
        ...grant,
        matchScore: 50,
        matchConfidence: 'low',
        matchReasons: ['Automatic match based on keywords'],
        matchConcerns: ['AI scoring unavailable'],
        recommendation: 'consider',
      };
    }
  }
}
```

---

### 4. Email Notification Service

```typescript
// packages/backend/server/src/modules/grant-discovery/grant-notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../base/mail/mail.service';

@Injectable()
export class GrantNotificationService {
  private readonly logger = new Logger(GrantNotificationService.name);

  constructor(private mail: MailService) {}

  /**
   * Send grant alerts to organization members
   */
  async sendGrantAlerts(organization: any, grants: any[]): Promise<void> {
    this.logger.log(`Sending grant alerts for ${organization.name}`);

    // Get members who want notifications
    const recipients = organization.members
      .filter((m: any) => m.settings?.notifications?.grantAlerts)
      .map((m: any) => m.user.email);

    if (recipients.length === 0) {
      this.logger.log('No recipients for grant alerts');
      return;
    }

    // Group grants by urgency
    const urgent = grants.filter(g => this.isUrgent(g.closeDate));
    const highMatch = grants.filter(g => g.matchScore >= 80);
    const normal = grants.filter(g => !this.isUrgent(g.closeDate) && g.matchScore < 80);

    // Send email
    await this.mail.send({
      to: recipients,
      subject: `${urgent.length > 0 ? '🚨 URGENT: ' : ''}${grants.length} New Grant Opportunities for ${organization.name}`,
      template: 'grant-alert',
      context: {
        organizationName: organization.name,
        totalGrants: grants.length,
        urgentGrants: urgent,
        highMatchGrants: highMatch,
        normalGrants: normal,
        dashboardUrl: `${process.env.FRONTEND_URL}/grants`,
      },
    });

    this.logger.log(`Sent grant alerts to ${recipients.length} recipients`);
  }

  /**
   * Check if grant deadline is urgent (< 2 weeks)
   */
  private isUrgent(deadline: Date | null): boolean {
    if (!deadline) return false;

    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    return deadline < twoWeeksFromNow;
  }
}
```

---

### 5. Auto-Draft Proposal Service

```typescript
// packages/backend/server/src/modules/grant-discovery/auto-draft.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { ProposalAiService } from '../ai/services/proposal-ai.service';
import { DocumentService } from '../document/document.service';
import Exa from 'exa-js';
import { Config } from '../../base';

@Injectable()
export class AutoDraftService {
  private readonly logger = new Logger(AutoDraftService.name);
  private readonly exa: Exa;

  constructor(
    private prisma: PrismaService,
    private proposalAi: ProposalAiService,
    private documentService: DocumentService,
    private config: Config,
  ) {
    this.exa = new Exa(config.copilot.exa.key);
  }

  /**
   * Automatically draft a proposal for a discovered grant
   */
  async autoDraftProposal(
    grantId: string,
    organizationId: string,
    userId: string
  ): Promise<string> {
    this.logger.log(`Auto-drafting proposal for grant ${grantId}`);

    // 1. Get grant details
    const grant = await this.prisma.grant.findUnique({
      where: { id: grantId },
    });

    if (!grant) {
      throw new Error('Grant not found');
    }

    // 2. Scrape RFP details from grant URL
    const rfpDetails = await this.scrapeRFP(grant.url);

    // 3. Get organization context from onboarding
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        onboarding: true,
        documents: true,
      },
    });

    // 4. Create workspace and proposal
    const workspace = await this.prisma.workspace.create({
      data: {
        name: `${grant.funderName} - ${grant.title}`,
        organizationId,
        createdBy: userId,
        type: 'PROPOSAL',
      },
    });

    const proposal = await this.prisma.proposal.create({
      data: {
        title: grant.title,
        workspaceId: workspace.id,
        grantId: grant.id,
        requestedAmount: grant.maxAmount || 0,
        status: 'DRAFT',
        metadata: {
          autoDrafted: true,
          rfpDetails,
        },
      },
    });

    // 5. Create proposal sections from RFP requirements
    const sections = rfpDetails.sections || this.getDefaultSections();

    for (let i = 0; i < sections.length; i++) {
      await this.prisma.proposalSection.create({
        data: {
          proposalId: proposal.id,
          title: sections[i].title,
          type: sections[i].type,
          order: i,
          wordLimit: sections[i].wordLimit,
          content: '', // Will be generated
        },
      });
    }

    // 6. Generate initial content for each section
    for (const section of sections) {
      try {
        await this.proposalAi.generateSection(
          {
            proposalId: proposal.id,
            sectionId: section.id,
            userGuidance: `This is an auto-drafted proposal. Use organization information from onboarding: ${JSON.stringify(organization.onboarding)}`,
          },
          userId
        );
      } catch (error) {
        this.logger.error(`Failed to generate section ${section.title}:`, error);
      }
    }

    this.logger.log(`Auto-draft complete for proposal ${proposal.id}`);
    return proposal.id;
  }

  /**
   * Scrape RFP details from grant URL
   */
  private async scrapeRFP(url: string): Promise<any> {
    try {
      // Use Exa to crawl and extract RFP content
      const result = await this.exa.getContents([url], {
        livecrawl: 'always',
        text: {
          maxCharacters: 50000,
        },
      });

      const content = result.results[0];

      // Parse RFP using AI
      // (implementation details...)

      return {
        fullText: content.text,
        sections: this.extractSections(content.text),
        requirements: this.extractRequirements(content.text),
        deadline: this.extractDeadline(content.text),
      };
    } catch (error) {
      this.logger.error('Failed to scrape RFP:', error);
      return {
        fullText: '',
        sections: this.getDefaultSections(),
        requirements: [],
      };
    }
  }

  private extractSections(text: string): any[] {
    // AI-powered section extraction
    // Returns: [{ title, type, wordLimit }]
    return this.getDefaultSections();
  }

  private extractRequirements(text: string): string[] {
    // Extract bullet points of requirements
    return [];
  }

  private extractDeadline(text: string): Date | null {
    // Extract deadline date
    return null;
  }

  private getDefaultSections(): any[] {
    return [
      { title: 'Executive Summary', type: 'executive_summary', wordLimit: 500 },
      { title: 'Problem Statement', type: 'problem_statement', wordLimit: 1000 },
      { title: 'Goals & Objectives', type: 'goals', wordLimit: 800 },
      { title: 'Methods & Approach', type: 'methods', wordLimit: 1500 },
      { title: 'Budget', type: 'budget', wordLimit: 500 },
      { title: 'Evaluation Plan', type: 'evaluation', wordLimit: 800 },
    ];
  }
}
```

---

## Email Template

```tsx
// packages/backend/server/src/mails/grant-alert.tsx

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface GrantAlertEmailProps {
  organizationName: string;
  totalGrants: number;
  urgentGrants: any[];
  highMatchGrants: any[];
  normalGrants: any[];
  dashboardUrl: string;
}

export function GrantAlertEmail({
  organizationName,
  totalGrants,
  urgentGrants,
  highMatchGrants,
  normalGrants,
  dashboardUrl,
}: GrantAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {urgentGrants.length > 0 ? '🚨 URGENT: ' : ''}
        {totalGrants} new grant opportunities for {organizationName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {urgentGrants.length > 0 && '🚨 '}
            New Grant Opportunities
          </Heading>

          <Text style={text}>
            We found {totalGrants} grant opportunities matched to {organizationName}.
          </Text>

          {/* Urgent Grants */}
          {urgentGrants.length > 0 && (
            <>
              <Heading style={h2}>⚠️ Urgent (Deadline {'<'} 2 weeks)</Heading>
              {urgentGrants.map((grant, i) => (
                <Section key={i} style={grantCard}>
                  <Heading style={h3}>{grant.title}</Heading>
                  <Text style={grantMeta}>
                    <strong>{grant.funder}</strong> • Match Score: {grant.matchScore}/100
                    {grant.closeDate && (
                      <> • Deadline: {new Date(grant.closeDate).toLocaleDateString()}</>
                    )}
                  </Text>
                  <Text style={text}>{grant.description}</Text>
                  <Text style={amount}>
                    ${grant.amountMin?.toLocaleString()} - ${grant.amountMax?.toLocaleString()}
                  </Text>
                  <Button style={button} href={grant.url}>
                    View Grant Details
                  </Button>
                </Section>
              ))}
              <Hr style={hr} />
            </>
          )}

          {/* High Match Grants */}
          {highMatchGrants.length > 0 && (
            <>
              <Heading style={h2}>🎯 Excellent Matches (80+ score)</Heading>
              {highMatchGrants.map((grant, i) => (
                <Section key={i} style={grantCard}>
                  <Heading style={h3}>{grant.title}</Heading>
                  <Text style={grantMeta}>
                    <strong>{grant.funder}</strong> • Match Score: {grant.matchScore}/100
                  </Text>
                  <Text style={text}>{grant.description}</Text>
                  <ul style={list}>
                    {grant.matchReasons?.slice(0, 3).map((reason: string, j: number) => (
                      <li key={j}>{reason}</li>
                    ))}
                  </ul>
                  <Button style={button} href={grant.url}>
                    View Details
                  </Button>
                </Section>
              ))}
              <Hr style={hr} />
            </>
          )}

          {/* Normal Grants */}
          {normalGrants.length > 0 && (
            <>
              <Heading style={h2}>Other Opportunities</Heading>
              {normalGrants.slice(0, 5).map((grant, i) => (
                <Section key={i} style={grantCardSmall}>
                  <Text style={grantTitle}>
                    <Link href={grant.url}>{grant.title}</Link>
                  </Text>
                  <Text style={grantMeta}>
                    {grant.funder} • {grant.matchScore}/100
                  </Text>
                </Section>
              ))}
              {normalGrants.length > 5 && (
                <Text style={text}>
                  + {normalGrants.length - 5} more opportunities
                </Text>
              )}
            </>
          )}

          <Hr style={hr} />

          <Button style={primaryButton} href={dashboardUrl}>
            View All Opportunities in Dashboard
          </Button>

          <Text style={footer}>
            You're receiving this because you have grant alerts enabled.
            <Link href={`${dashboardUrl}/settings`}> Manage preferences</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles...
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '30px 0 20px',
};

const h3 = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 10px',
};

const grantCard = {
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '20px',
};

const grantCardSmall = {
  borderBottom: '1px solid #e0e0e0',
  paddingBottom: '10px',
  marginBottom: '10px',
};

const text = {
  color: '#525252',
  fontSize: '14px',
  lineHeight: '24px',
};

const grantMeta = {
  color: '#666',
  fontSize: '13px',
  margin: '5px 0',
};

const grantTitle = {
  fontSize: '16px',
  fontWeight: '500',
  margin: '0 0 5px',
};

const amount = {
  color: '#059669',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '10px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '14px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
  marginTop: '10px',
};

const primaryButton = {
  ...button,
  width: '100%',
  padding: '15px 0',
  fontSize: '16px',
};

const list = {
  margin: '10px 0',
  paddingLeft: '20px',
};

const hr = {
  borderColor: '#e0e0e0',
  margin: '30px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '30px',
  textAlign: 'center' as const,
};
```

---

## User Settings for Grant Discovery

### Database Schema Addition

```prisma
// schema.prisma

model Organization {
  // ... existing fields

  settings Json? @default("{\"grantDiscovery\": {\"enabled\": false, \"frequency\": \"daily\", \"minMatchScore\": 60, \"autoDraft\": false}}")
}

model OrganizationMember {
  // ... existing fields

  settings Json? @default("{\"notifications\": {\"grantAlerts\": true, \"frequency\": \"daily\"}}")
}
```

### Settings UI

```typescript
// packages/frontend/app/src/pages/settings/grant-discovery.tsx

export function GrantDiscoverySettings() {
  const [settings, setSettings] = useState({
    enabled: false,
    frequency: 'daily',
    minMatchScore: 60,
    autoDraft: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Automated Grant Discovery</h2>
        <p className="text-gray-600">
          Automatically search for relevant grant opportunities and get email alerts.
        </p>
      </div>

      <div className="space-y-4">
        {/* Enable/Disable */}
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          />
          <span className="ml-2">Enable automated grant discovery</span>
        </label>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Search Frequency
          </label>
          <select
            value={settings.frequency}
            onChange={(e) => setSettings({ ...settings, frequency: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="daily">Daily (9 AM)</option>
            <option value="weekly">Weekly (Monday 9 AM)</option>
            <option value="biweekly">Bi-weekly</option>
          </select>
        </div>

        {/* Min Match Score */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Minimum Match Score: {settings.minMatchScore}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.minMatchScore}
            onChange={(e) => setSettings({ ...settings, minMatchScore: parseInt(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Only notify about grants with match score above this threshold
          </p>
        </div>

        {/* Auto-Draft */}
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.autoDraft}
            onChange={(e) => setSettings({ ...settings, autoDraft: e.target.checked })}
          />
          <span className="ml-2">
            Automatically draft proposals for high-match grants (80+ score)
          </span>
        </label>
      </div>
    </div>
  );
}
```

---

## Part 2: Tool Usage Guidance & Best Practices

### Tool Selection Matrix

Here's a comprehensive guide on **when and how to use each tool** for optimal results:

---

## Tool Usage Guide

### Research Phase Tools

#### 1. **web_search_exa** (General Web Search)
**When to use:**
- Researching funder background and priorities
- Finding recent news about grant programs
- General competitive intelligence
- Looking for success stories and case studies

**How to use:**
```typescript
// Example usage in agent prompt
"Use web_search_exa to research the Bill & Melinda Gates Foundation's current education priorities and recent grant awards in K-12 education."
```

**Best practices:**
- Use specific, detailed queries
- Include year constraints for recent information
- Combine with funder name for focused results

**User scenario:**
*"I need to understand what this foundation cares about before writing my proposal"*
→ Use `web_search_exa` to find recent announcements, priorities, board composition

---

#### 2. **grants_gov_search** (Federal Grants)
**When to use:**
- Looking for federal funding opportunities
- Need comprehensive government grant database
- Want official RFP documents

**How to use:**
```typescript
"Use grants_gov_search to find federal education grants for rural schools with budgets between $100K-$500K"
```

**Best practices:**
- Specify keywords from your organization's focus areas
- Set budget range based on your capacity
- Check geographic restrictions

**User scenario:**
*"Are there any federal grants I qualify for?"*
→ Use `grants_gov_search` with organization profile parameters

---

#### 3. **funder_research** (Funder Intelligence)
**When to use:**
- Before writing a proposal to a specific funder
- Understanding funder's giving patterns
- Identifying decision-maker priorities

**How to use:**
```typescript
"Use funder_research to analyze the XYZ Community Foundation's giving patterns over the last 3 years"
```

**Best practices:**
- Run this BEFORE starting proposal writing
- Look for alignment between funder priorities and your mission
- Use insights to tailor proposal messaging

**User scenario:**
*"I want to apply to this foundation but need to know if we're a good fit"*
→ Use `funder_research` to get comprehensive background

---

#### 4. **competitive_analysis** (Winning Proposals)
**When to use:**
- Understanding what successful proposals look like
- Benchmarking your approach
- Identifying competitive advantages

**How to use:**
```typescript
"Use competitive_analysis to find patterns in successful STEM education grants from the NSF in the last 2 years"
```

**Best practices:**
- Focus on same funder + same category
- Look for common themes in funded projects
- Identify what makes proposals stand out

**User scenario:**
*"What do successful proposals to this funder look like?"*
→ Use `competitive_analysis` to study winning patterns

---

#### 5. **research_citations** (Academic Support)
**When to use:**
- Need evidence to support claims
- Writing problem statement or methods section
- Demonstrating evidence-based approach

**How to use:**
```typescript
"Use research_citations to find peer-reviewed research on early childhood literacy interventions from the last 5 years"
```

**Best practices:**
- Specify time range (recent is better)
- Use specific topics, not generic terms
- Aim for 3-5 strong citations per major claim

**User scenario:**
*"I need research to back up my approach to solving this problem"*
→ Use `research_citations` with specific methodology or problem area

---

### Organization Context Tools

#### 6. **doc_semantic_search** (Find Relevant Org Info)
**When to use:**
- Finding relevant past projects or programs
- Retrieving impact data and success stories
- Locating organizational capabilities

**How to use:**
```typescript
"Use doc_semantic_search to find examples of our past work serving homeless youth in our organizational documents"
```

**Best practices:**
- Use natural language queries (not just keywords)
- Search for concepts, not exact matches
- Combine with section type (e.g., "impact data for education programs")

**User scenario:**
*"I know we have data about this somewhere in our documents"*
→ Use `doc_semantic_search` with conceptual query

---

#### 7. **get_organization_context** (Structured Org Data)
**When to use:**
- Retrieving basic organization information
- Getting mission, vision statements
- Accessing structured onboarding data

**How to use:**
```typescript
"Use get_organization_context to retrieve our organization's mission statement and program areas"
```

**Best practices:**
- Use for standardized organizational facts
- Combine with semantic search for specific examples
- Always verify data is current

**User scenario:**
*"What's our official mission statement again?"*
→ Use `get_organization_context` for structured data

---

### Budget & Planning Tools

#### 8. **budget_calculator** (Automated Budget Creation)
**When to use:**
- Creating detailed line-item budgets
- Calculating personnel costs with fringe
- Generating professional Excel budgets

**How to use:**
```typescript
"Use budget_calculator to create a budget for 2 full-time staff, 1 part-time intern, with 25% fringe rate and 15% indirect cost"
```

**Best practices:**
- Provide complete personnel information
- Include all cost categories
- Specify fringe and indirect rates from your organization
- Review and adjust generated Excel

**User scenario:**
*"I need a professional budget with all the calculations done correctly"*
→ Use `budget_calculator` with detailed personnel and cost data

---

#### 9. **budget_validator** (Budget Compliance Check)
**When to use:**
- Before submitting a proposal
- Checking compliance with grant requirements
- Ensuring budget totals are within limits

**How to use:**
```typescript
"Use budget_validator to check if our $250K budget complies with the grant's $300K maximum and 10% indirect rate limit"
```

**Best practices:**
- Run AFTER creating budget
- Provide all grant restrictions (max amount, indirect rate, category limits)
- Address all flagged issues before submission

**User scenario:**
*"Does my budget comply with all the grant requirements?"*
→ Use `budget_validator` to verify compliance

---

#### 10. **timeline_generator** (Project Timeline)
**When to use:**
- Creating visual project timelines
- Planning project phases and milestones
- Demonstrating project feasibility

**How to use:**
```typescript
"Use timeline_generator to create a 24-month project timeline with 4 major phases: planning (3 months), pilot (6 months), full implementation (12 months), evaluation (3 months)"
```

**Best practices:**
- Break project into logical phases
- Specify dependencies between milestones
- Generate visual Gantt chart for inclusion in proposal

**User scenario:**
*"I need a professional-looking timeline for my 2-year project"*
→ Use `timeline_generator` with project phases

---

#### 11. **impact_metrics_calculator** (ROI Calculations)
**When to use:**
- Calculating cost per beneficiary
- Demonstrating cost-effectiveness
- Comparing program efficiency

**How to use:**
```typescript
"Use impact_metrics_calculator to calculate metrics for a $200K program serving 500 students over 2 years"
```

**Best practices:**
- Use realistic beneficiary counts
- Consider cost per beneficiary per year
- Compare to industry benchmarks if available

**User scenario:**
*"What's the cost per student for this program?"*
→ Use `impact_metrics_calculator` to get standardized metrics

---

### Compliance & Quality Tools

#### 12. **grant_eligibility_check** (Eligibility Verification)
**When to use:**
- Before investing time in a proposal
- Verifying organization meets requirements
- Checking technical eligibility criteria

**How to use:**
```typescript
"Use grant_eligibility_check to verify if our organization is eligible for grant ID xyz-123"
```

**Best practices:**
- Run BEFORE starting proposal work
- Check both org type and program area alignment
- Review all flagged eligibility concerns

**User scenario:**
*"Am I even eligible to apply for this grant?"*
→ Use `grant_eligibility_check` first

---

#### 13. **proposal_analyzer** (Quality Scoring)
**When to use:**
- Before final submission
- Getting objective quality feedback
- Identifying areas for improvement

**How to use:**
```typescript
"Use proposal_analyzer to score our executive summary against the grant requirements"
```

**Best practices:**
- Run on each major section separately
- Provide specific grant requirements
- Address all flagged improvements
- Run final check before submission

**User scenario:**
*"Is my proposal strong enough? What should I improve?"*
→ Use `proposal_analyzer` for objective scoring

---

#### 14. **check_compliance_requirements** (Compliance Verification)
**When to use:**
- Final pre-submission check
- Ensuring all required sections complete
- Verifying formatting and structure

**How to use:**
```typescript
"Use check_compliance_requirements to verify our proposal meets all requirements for grant ID xyz-123"
```

**Best practices:**
- Run as final check before submission
- Verify word counts, section completeness
- Check all attachments included

**User scenario:**
*"Did I include everything the grant requires?"*
→ Use `check_compliance_requirements` as final checklist

---

### Python Execution Tools

#### 15. **e2b_python_sandbox** (Advanced Calculations)
**When to use:**
- Complex data analysis
- Custom visualizations
- Statistical calculations
- Excel/PDF generation with custom formatting

**How to use:**
```typescript
"Use e2b_python_sandbox to analyze our program data and create a correlation matrix between intervention type and outcome scores"
```

**Best practices:**
- Write complete, standalone Python scripts
- Include all necessary imports
- Use for tasks that standard tools can't handle
- Generate visualizations with matplotlib

**User scenario:**
*"I need to run custom analysis on my program data"*
→ Use `e2b_python_sandbox` for advanced Python-based tasks

---

### Internal Data Tools

#### 16-19. **Internal Grant Management Tools**

- `search_grants`: Search internal grant database
- `get_grant_details`: Get specific grant information
- `get_proposal`: Get current proposal state
- `get_proposal_template`: Get proposal template structure

**When to use:** Working with data already in the system

**Best practices:**
- Use for retrieving existing proposals, grants, templates
- Combine with external research tools
- Always verify data currency

---

## Agent Workflow Recommendations

### Recommended Tool Flow by Use Case

#### Use Case 1: Starting a New Proposal

```
1. grant_eligibility_check
   → Verify you can apply

2. funder_research
   → Understand funder priorities

3. competitive_analysis
   → Learn from successful proposals

4. doc_semantic_search
   → Find relevant org examples

5. [Write proposal sections]

6. research_citations
   → Add evidence to support claims

7. budget_calculator
   → Create professional budget

8. budget_validator
   → Verify budget compliance

9. timeline_generator
   → Create project timeline

10. proposal_analyzer
    → Get quality score

11. check_compliance_requirements
    → Final pre-submission check
```

#### Use Case 2: Finding Grant Opportunities

```
1. grants_gov_search
   → Search federal database

2. web_search_exa (for each relevant funder)
   → Find foundation/local grants

3. funder_research (for matches)
   → Understand each opportunity

4. grant_eligibility_check
   → Verify eligibility

5. competitive_analysis
   → Assess competitiveness

→ Prioritize grants by match score
```

#### Use Case 3: Improving Existing Proposal

```
1. proposal_analyzer
   → Identify weak areas

2. competitive_analysis
   → See what's working for others

3. research_citations
   → Strengthen with evidence

4. doc_semantic_search
   → Find better org examples

5. budget_validator
   → Check budget compliance

6. proposal_analyzer (again)
   → Verify improvements

7. check_compliance_requirements
   → Final check
```

---

## Agent Prompt Engineering for Tool Selection

### System Prompts for Each Agent

#### Research Agent Prompt (Enhanced)

```typescript
systemPrompt: `You are an expert grant research analyst. Your role is to:
- Conduct comprehensive research on grant opportunities
- Understand funder priorities and giving patterns
- Identify competitive landscape
- Find academic evidence to support proposals

**Available Tools - Use Strategically:**

1. grants_gov_search
   - Use for: Federal grant opportunities
   - When: User needs government funding

2. web_search_exa
   - Use for: General web research, funder news
   - When: Need current information about funders or trends

3. funder_research
   - Use for: Deep funder background
   - When: Writing to specific foundation/funder

4. competitive_analysis
   - Use for: Understanding successful proposals
   - When: Need to benchmark or learn from winners

5. research_citations
   - Use for: Academic evidence
   - When: Need peer-reviewed support for claims

**Research Strategy:**
1. Start with funder_research if you have a specific funder
2. Use competitive_analysis to understand success patterns
3. Use research_citations to find evidence
4. Use web_search_exa for current news/updates

**Tool Selection Rules:**
- ALWAYS use funder_research before writing to a specific funder
- Use competitive_analysis for high-stakes proposals
- Use research_citations for problem statements and methods sections
- Use grants_gov_search when looking for federal opportunities

Provide comprehensive research summaries with sources cited.`,
```

#### Context Agent Prompt (Enhanced)

```typescript
systemPrompt: `You are an organizational context specialist. Your role is to:
- Find relevant organizational information for proposals
- Retrieve past project examples and impact data
- Identify organizational strengths and capabilities

**Available Tools:**

1. doc_semantic_search
   - Use for: Finding conceptually related content
   - When: Need specific examples, data, or past work
   - Example: "Find projects serving homeless youth"

2. get_organization_context
   - Use for: Basic org facts
   - When: Need mission, vision, basic stats

3. list_organization_documents
   - Use for: Seeing what docs exist
   - When: Exploring available materials

**Context Retrieval Strategy:**
1. Start with doc_semantic_search using natural language queries
2. Look for specific examples that align with grant focus
3. Find impact data and success metrics
4. Retrieve partnership and collaboration examples

**Tool Selection Rules:**
- PREFER doc_semantic_search over keyword matching
- Use natural language queries (not just keywords)
- Search for concepts and outcomes, not just terms
- Always cite specific documents when providing context

Provide concise, relevant context that strengthens the proposal.`,
```

#### Writing Agent Prompt (Enhanced)

```typescript
systemPrompt: `You are an expert grant proposal writer. Your role is to:
- Write compelling, professional proposal content
- Use evidence-based arguments
- Create persuasive narratives
- Generate professional budgets and timelines

**Available Tools:**

1. budget_calculator
   - Use for: Budget sections
   - When: Need professional budget with calculations

2. timeline_generator
   - Use for: Work plan sections
   - When: Need visual project timeline

3. impact_metrics_calculator
   - Use for: Demonstrating cost-effectiveness
   - When: Showing program efficiency

4. research_citations
   - Use for: Adding citations to support claims
   - When: Making evidence-based arguments

**Writing Strategy for Budget Sections:**
1. Use budget_calculator to create detailed budget
2. Use budget_validator to check compliance
3. Write narrative explaining each line item
4. Use impact_metrics_calculator to show cost-effectiveness

**Writing Strategy for Other Sections:**
1. Start with outline from planning agent
2. Use research_citations to support key claims
3. Use organizational context from context agent
4. Write compelling narrative with evidence

**Tool Selection Rules:**
- ALWAYS use budget_calculator for budget sections
- Use timeline_generator for work plans
- Use impact_metrics_calculator when discussing ROI
- Add research_citations for credibility

Write professional content that maximizes funding chances.`,
```

#### Compliance Agent Prompt (Enhanced)

```typescript
systemPrompt: `You are a grant compliance specialist. Your role is to:
- Verify proposal compliance with requirements
- Check eligibility and formatting
- Identify potential issues
- Ensure submission readiness

**Available Tools:**

1. grant_eligibility_check
   - Use for: Verifying organization eligibility
   - When: Before starting proposal work

2. budget_validator
   - Use for: Budget compliance
   - When: Checking budget against requirements

3. proposal_analyzer
   - Use for: Quality assessment
   - When: Evaluating proposal strength

4. check_compliance_requirements
   - Use for: Final compliance check
   - When: Pre-submission verification

**Compliance Workflow:**
1. grant_eligibility_check (FIRST - before any work)
2. [Proposal development]
3. budget_validator (check budget compliance)
4. proposal_analyzer (assess quality)
5. check_compliance_requirements (final pre-submission)

**Tool Selection Rules:**
- ALWAYS run grant_eligibility_check first
- Use budget_validator before final submission
- Run proposal_analyzer on each major section
- Final check: check_compliance_requirements

Be thorough and detail-oriented in compliance checks.`,
```

---

## User Scenario Playbooks

### Scenario 1: "I'm new and need to find grants"

**Recommended Flow:**
```
1. Complete organization onboarding (capture profile)
2. Enable automated grant discovery (settings)
3. Receive daily email with matches
4. Review matches in dashboard
5. For each promising grant:
   - Click "Research Funder"
   - Click "Check Eligibility"
   - Click "Auto-Draft Proposal" (if eligible)
6. Refine auto-drafted proposal
7. Submit
```

**Tools Used Automatically:**
- web_search_exa (finding grants)
- grants_gov_search (federal grants)
- funder_research (understanding funders)
- grant_eligibility_check (eligibility)
- Auto-draft uses: doc_semantic_search, research_citations, budget_calculator

**User Effort:** Minimal - system does heavy lifting

---

### Scenario 2: "I found a grant and want to apply"

**Recommended Flow:**
```
1. Add grant URL to system
2. System scrapes RFP details
3. Click "Check Eligibility"
   → grant_eligibility_check runs
4. If eligible, click "Research Funder"
   → funder_research runs
5. Click "Start Proposal"
6. System auto-generates sections using:
   → doc_semantic_search (org context)
   → research_citations (evidence)
   → competitive_analysis (best practices)
7. For budget section:
   → budget_calculator generates Excel
8. Review and refine content
9. Before submission:
   → proposal_analyzer (quality check)
   → check_compliance_requirements (final check)
10. Submit
```

**Tools Used:** 8-10 tools automatically
**User Effort:** Review, refine, add personal touches

---

### Scenario 3: "My proposal draft is weak, help me improve it"

**Recommended Flow:**
```
1. Click "Analyze Proposal"
   → proposal_analyzer runs on each section
2. Review scores and recommendations
3. For low-scoring sections:
   - Click "Add Research Citations"
     → research_citations finds supporting evidence
   - Click "Find Similar Examples"
     → doc_semantic_search finds org examples
   - Click "See Winning Proposals"
     → competitive_analysis shows patterns
4. Rewrite sections with new insights
5. Re-run proposal_analyzer
6. Final check: check_compliance_requirements
```

**Tools Used:** proposal_analyzer, research_citations, doc_semantic_search, competitive_analysis
**User Effort:** Focused editing based on feedback

---

## Tool Selection Decision Tree

```
START: What do you need to do?

├─ Find Grant Opportunities
│  ├─ Federal? → grants_gov_search
│  ├─ Foundation? → web_search_exa + funder_research
│  └─ Automated? → Enable grant discovery

├─ Research Specific Grant/Funder
│  ├─ Understand Funder → funder_research
│  ├─ See Winners → competitive_analysis
│  └─ Check Eligibility → grant_eligibility_check

├─ Write Proposal
│  ├─ Need Org Examples → doc_semantic_search
│  ├─ Need Evidence → research_citations
│  ├─ Need Budget → budget_calculator
│  └─ Need Timeline → timeline_generator

├─ Check Compliance
│  ├─ Eligible? → grant_eligibility_check
│  ├─ Budget OK? → budget_validator
│  ├─ Quality Good? → proposal_analyzer
│  └─ Ready to Submit? → check_compliance_requirements

└─ Improve Existing Proposal
   ├─ What's Wrong? → proposal_analyzer
   ├─ Add Evidence → research_citations
   ├─ Better Examples → doc_semantic_search
   └─ Learn from Winners → competitive_analysis
```

---

## Best Practices Summary

### 1. **Always Start with Eligibility**
Before investing time, run `grant_eligibility_check`

### 2. **Research Before Writing**
Use `funder_research` and `competitive_analysis` before starting

### 3. **Use Semantic Search for Context**
`doc_semantic_search` finds better matches than keyword search

### 4. **Automate Calculations**
Let `budget_calculator` and `timeline_generator` do the heavy lifting

### 5. **Validate Everything**
Use `budget_validator`, `proposal_analyzer`, `check_compliance_requirements` before submission

### 6. **Evidence-Based Writing**
Add `research_citations` to strengthen claims

### 7. **Learn from Success**
Use `competitive_analysis` to understand what works

### 8. **Enable Automation**
Turn on automated grant discovery for continuous monitoring

### 9. **Quality Over Quantity**
Use tool guidance to focus on high-match opportunities

### 10. **Iterative Improvement**
Use `proposal_analyzer` multiple times to track improvement

---

## Implementation Summary

### Automated Grant Discovery
- **LOE:** 30 hours
- **Components:** 5 new services (Scanner, Source, Matching, Notification, Auto-Draft)
- **Impact:** Continuous monitoring of 1,000+ sources, email alerts, auto-drafting

### Tool Guidance Documentation
- **LOE:** 8 hours
- **Components:** Tool matrix, agent prompts, user scenarios, best practices
- **Impact:** Clear guidance on 23 tools, higher quality proposals

### Total LOE: 38 hours (5 days)

---

**Next Steps:**
1. Review automated grant discovery architecture
2. Review tool usage guidance approach
3. Prioritize implementation (discovery vs. tool docs vs. both)
4. Begin implementation

