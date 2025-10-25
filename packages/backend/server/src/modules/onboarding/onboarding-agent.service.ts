import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import Exa from 'exa-js';
import { OnboardingService } from './onboarding.service';
import { QualityScorerService } from './quality-scorer.service';
import { ConfigService } from '@nestjs/config';

export interface ExtractedOrganizationData {
  // Identity
  mission?: string;
  vision?: string;
  values?: string[];
  focusAreas?: string[];
  geographicScope?: string;
  targetPopulation?: string;

  // Needs & Gaps
  primaryNeed?: string;
  needEvidence?: Array<{ statistic: string; source: string; year?: number }>;
  uniqueApproach?: string;
  gapsInSolutions?: string;
  impactWithoutOrg?: string;

  // Programs
  programs?: Array<{
    name: string;
    description: string;
    needAddressed?: string;
    howAddressesNeed?: string;
    targetPopulation?: string;
    outcomes?: string[];
    needEvidence?: Array<{ statistic: string; source: string }>;
  }>;

  // Capacity
  staffCount?: number;
  boardCount?: number;

  // Confidence
  confidence: number;
}

@Injectable()
export class OnboardingAgentService {
  private readonly logger = new Logger(OnboardingAgentService.name);
  private readonly anthropic: Anthropic;
  private readonly exa: Exa | null;
  private readonly defaultModel = 'claude-3-5-sonnet-20241022';

  constructor(
    private onboardingService: OnboardingService,
    private qualityScorer: QualityScorerService,
    private configService: ConfigService
  ) {
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const exaKey = this.configService.get<string>('EXA_API_KEY');

    if (!anthropicKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured - AI extraction will not work');
    }

    this.anthropic = new Anthropic({
      apiKey: anthropicKey || 'placeholder',
    });

    if (!exaKey) {
      this.logger.warn('EXA_API_KEY not configured - website import will not work');
      this.exa = null;
    } else {
      this.exa = new Exa(exaKey);
    }
  }

  /**
   * Extract organization data from document content using Claude
   */
  async extractOrganizationData(
    organizationId: string,
    documentContent: string
  ): Promise<ExtractedOrganizationData> {
    this.logger.log(`Extracting organization data for ${organizationId}`);

    const systemPrompt = this.buildExtractionPrompt();

    try {
      const response = await this.anthropic.messages.create({
        model: this.defaultModel,
        max_tokens: 8000,
        temperature: 0.2, // Lower temperature for more consistent extraction
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please extract organization information from this document:\n\n${documentContent.substring(0, 50000)}`,
          },
        ],
      });

      const textContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('\n');

      // Parse JSON response
      const extracted = this.parseExtractionResponse(textContent);

      // Auto-save extracted data
      await this.autoSaveExtractedData(organizationId, extracted);

      return extracted;
    } catch (error) {
      this.logger.error(`Extraction failed for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Extract organization data from website using Exa
   */
  async extractFromWebsite(organizationId: string, websiteUrl: string): Promise<ExtractedOrganizationData> {
    this.logger.log(`Extracting from website: ${websiteUrl}`);

    if (!this.exa) {
      throw new Error('EXA_API_KEY not configured - website import unavailable');
    }

    try {
      // Use Exa to crawl the website
      const crawlResult = await this.exa.getContents([websiteUrl], {
        livecrawl: 'always',
        text: {
          maxCharacters: 100000,
        },
      });

      if (crawlResult.results.length === 0 || !crawlResult.results[0].text) {
        throw new Error('Failed to crawl website - no content extracted');
      }

      const websiteContent = crawlResult.results[0].text;

      this.logger.log(`Extracted ${websiteContent.length} characters from ${websiteUrl}`);

      // Extract using Claude
      return this.extractOrganizationData(organizationId, websiteContent);
    } catch (error) {
      this.logger.error(`Website extraction failed for ${websiteUrl}:`, error);
      throw error;
    }
  }

  /**
   * Build comprehensive extraction prompt for Claude
   */
  private buildExtractionPrompt(): string {
    return `You are an expert at extracting structured information from nonprofit organization documents.

Your task is to extract the following information from documents (annual reports, strategic plans, websites, etc.):

## Identity
- Mission statement (1-3 sentences)
- Vision statement (1-2 sentences)
- Core values (list)
- Focus areas / issue areas (list)
- Geographic scope (where they operate)
- Target population (who they serve)

## Needs & Gaps ⭐ CRITICAL FOR GRANT WRITING
- Primary need/problem the organization addresses (2-4 sentences with data if available)
- Supporting evidence (array of {statistic, source, year})
  - Example: {"statistic": "40% of students lack access to after-school programs", "source": "2024 County Assessment", "year": 2024}
- Impact without this organization (what would happen if they didn't exist)
- Gaps in existing solutions (why current programs/services are inadequate)
- Organization's unique approach (how they solve the problem differently)

## Programs
- Array of programs with:
  - Name
  - Description (2-3 sentences)
  - Need addressed (specific problem this program solves)
  - How it addresses the need (what the program does)
  - Target population
  - Outcomes/metrics
  - Evidence for this program's need (data/statistics)

## Capacity
- Staff count
- Board size

## Output Format
Return ONLY valid JSON with this structure:

\`\`\`json
{
  "mission": "Organization's core purpose...",
  "vision": "Aspirational future state...",
  "values": ["Integrity", "Compassion", "Excellence"],
  "focusAreas": ["Education", "Youth Development"],
  "geographicScope": "San Francisco Bay Area",
  "targetPopulation": "Low-income youth ages 12-18",

  "primaryNeed": "Detailed problem statement with quantifiable data...",
  "needEvidence": [
    {
      "statistic": "60% of youth in our service area lack access to after-school programs",
      "source": "2024 City Youth Services Report",
      "year": 2024
    }
  ],
  "uniqueApproach": "How this organization solves the problem uniquely...",
  "gapsInSolutions": "Why existing programs fall short...",
  "impactWithoutOrg": "What would happen without this organization...",

  "programs": [
    {
      "name": "After-School Tutoring Program",
      "description": "1-on-1 tutoring for struggling readers...",
      "needAddressed": "Low-income 3rd graders read below grade level",
      "howAddressesNeed": "Provides evidence-based literacy instruction 3x/week",
      "targetPopulation": "3rd-5th grade students reading below grade level",
      "outcomes": ["85% improve reading level by 1+ grade", "90% attendance rate"],
      "needEvidence": [
        {
          "statistic": "65% of 3rd graders in our school district read below grade level",
          "source": "District Assessment 2024"
        }
      ]
    }
  ],

  "staffCount": 15,
  "boardCount": 12,

  "confidence": 0.85
}
\`\`\`

## Instructions
- Extract ONLY information explicitly stated in the document
- For missing fields, use null (not empty strings)
- Include a confidence score (0-1) for the overall extraction
- For needs/gaps, prioritize extracting:
  1. Quantifiable data (numbers, percentages, statistics)
  2. Sources for evidence (citations, reports, studies)
  3. Specific problem statements (not vague descriptions)
  4. Recent data (prefer last 3 years)
- Return ONLY the JSON - no markdown code blocks, no explanations
- Ensure valid JSON syntax`;
  }

  /**
   * Parse AI extraction response and handle errors
   */
  private parseExtractionResponse(responseText: string): ExtractedOrganizationData {
    try {
      // Remove markdown code blocks if present
      let jsonText = responseText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      const extracted = JSON.parse(jsonText) as ExtractedOrganizationData;

      // Validate confidence score
      if (!extracted.confidence || extracted.confidence < 0 || extracted.confidence > 1) {
        extracted.confidence = 0.5; // Default to medium confidence
      }

      this.logger.log(`Extraction complete with ${extracted.confidence * 100}% confidence`);

      return extracted;
    } catch (error) {
      this.logger.error('Failed to parse extraction response:', error);
      this.logger.debug('Response text:', responseText);

      // Return minimal result with low confidence
      return {
        confidence: 0.1,
      };
    }
  }

  /**
   * Auto-save extracted data to database
   */
  private async autoSaveExtractedData(
    organizationId: string,
    extracted: ExtractedOrganizationData
  ): Promise<void> {
    try {
      // Save mission data if available
      if (extracted.mission) {
        await this.onboardingService.saveMission(organizationId, {
          mission: extracted.mission,
          vision: extracted.vision,
          values: extracted.values,
          focusAreas: extracted.focusAreas || [],
          geographicScope: extracted.geographicScope,
          targetPopulation: extracted.targetPopulation,
        });
        this.logger.log(`Saved mission data for org ${organizationId}`);
      }

      // Save needs data if available
      if (extracted.primaryNeed) {
        await this.onboardingService.saveNeeds(organizationId, {
          primaryNeed: extracted.primaryNeed,
          needEvidence: extracted.needEvidence,
          uniqueApproach: extracted.uniqueApproach,
          gapsInSolutions: extracted.gapsInSolutions,
          impactWithoutOrg: extracted.impactWithoutOrg,
        });
        this.logger.log(`Saved needs data for org ${organizationId}`);
      }

      // Save programs if available
      if (extracted.programs && extracted.programs.length > 0) {
        for (const program of extracted.programs) {
          await this.onboardingService.addProgram(organizationId, {
            name: program.name,
            description: program.description,
            needAddressed: program.needAddressed,
            howAddressesNeed: program.howAddressesNeed,
            needEvidence: program.needEvidence,
            targetPopulation: program.targetPopulation,
            outcomes: program.outcomes,
          });
        }
        this.logger.log(`Saved ${extracted.programs.length} programs for org ${organizationId}`);
      }

      // Save capacity if available
      if (extracted.staffCount || extracted.boardCount) {
        await this.onboardingService.saveCapacity(organizationId, {
          staffCount: extracted.staffCount,
          boardCount: extracted.boardCount,
        });
        this.logger.log(`Saved capacity data for org ${organizationId}`);
      }

      // Recalculate quality score after all saves
      await this.qualityScorer.calculateScore(organizationId);
      this.logger.log(`Recalculated quality score for org ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to auto-save extracted data for org ${organizationId}:`, error);
      // Don't throw - extraction was successful, just saving failed
    }
  }
}
