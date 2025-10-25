import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CurrentUser } from '@afk/server/base';
import { AuthGuard } from '../../core/auth';
import { OrganizationMemberGuard } from '../organization/guards/organization-member.guard';
import { OnboardingService } from './onboarding.service';
import { QualityScorerService } from './quality-scorer.service';
import { OnboardingAgentService } from './onboarding-agent.service';
import { BasicInfoInput } from './dto/basic-info.input';
import { MissionInput } from './dto/mission.input';
import { SaveNeedsInput } from './dto/needs.input';
import { ProgramInput } from './dto/program.input';
import { CapacityInput } from './dto/capacity.input';
import { OnboardingProgressOutput } from './dto/onboarding-status.output';
import { QualityScoreOutput, RecommendationOutput } from './dto/quality-score.output';
import { ExtractionResultOutput } from './dto/extraction.output';
import { OrganizationContextOutput } from './dto/organization-context.output';

@Resolver()
@UseGuards(AuthGuard, OrganizationMemberGuard)
export class OnboardingResolver {
  private readonly logger = new Logger(OnboardingResolver.name);

  constructor(
    private onboardingService: OnboardingService,
    private qualityScorer: QualityScorerService,
    private onboardingAgent: OnboardingAgentService
  ) {}

  @Mutation(() => OnboardingProgressOutput)
  async startOnboarding(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string
  ): Promise<OnboardingProgressOutput> {
    try {
      this.logger.log(`User ${user.id} starting onboarding for org ${organizationId}`);
      return this.onboardingService.startOnboarding(user.id, organizationId) as any;
    } catch (error) {
      this.logger.error(`Failed to start onboarding for org ${organizationId}:`, error);
      throw new InternalServerErrorException('Failed to start onboarding. Please try again.');
    }
  }

  @Mutation(() => Boolean)
  async saveBasicInfo(
    @CurrentUser() user: { id: string },
    @Args('input') input: BasicInfoInput
  ): Promise<boolean> {
    try {
      this.logger.log(`Saving basic info for org ${input.organizationId}`);
      await this.onboardingService.saveBasicInfo(input.organizationId, input);
      return true;
    } catch (error) {
      this.logger.error(`Failed to save basic info for org ${input.organizationId}:`, error);
      throw new InternalServerErrorException('Failed to save basic information. Please try again.');
    }
  }

  @Mutation(() => Boolean)
  async saveMission(
    @CurrentUser() user: { id: string },
    @Args('input') input: MissionInput
  ): Promise<boolean> {
    try {
      this.logger.log(`Saving mission for org ${input.organizationId}`);
      await this.onboardingService.saveMission(input.organizationId, input);
      return true;
    } catch (error) {
      this.logger.error(`Failed to save mission for org ${input.organizationId}:`, error);
      throw new InternalServerErrorException('Failed to save mission information. Please try again.');
    }
  }

  @Mutation(() => Boolean)
  async saveNeeds(
    @CurrentUser() user: { id: string },
    @Args('input') input: SaveNeedsInput
  ): Promise<boolean> {
    try {
      this.logger.log(`Saving needs for org ${input.organizationId}`);
      await this.onboardingService.saveNeeds(input.organizationId, input);
      return true;
    } catch (error) {
      this.logger.error(`Failed to save needs for org ${input.organizationId}:`, error);
      throw new InternalServerErrorException('Failed to save needs information. Please try again.');
    }
  }

  @Mutation(() => Boolean)
  async addProgram(
    @CurrentUser() user: { id: string },
    @Args('input') input: ProgramInput
  ): Promise<boolean> {
    try {
      this.logger.log(`Adding program for org ${input.organizationId}`);
      await this.onboardingService.addProgram(input.organizationId, input);
      return true;
    } catch (error) {
      this.logger.error(`Failed to add program for org ${input.organizationId}:`, error);
      throw new InternalServerErrorException('Failed to add program. Please try again.');
    }
  }

  @Mutation(() => Boolean)
  async saveCapacity(
    @CurrentUser() user: { id: string },
    @Args('input') input: CapacityInput
  ): Promise<boolean> {
    try {
      this.logger.log(`Saving capacity for org ${input.organizationId}`);
      await this.onboardingService.saveCapacity(input.organizationId, input);
      return true;
    } catch (error) {
      this.logger.error(`Failed to save capacity for org ${input.organizationId}:`, error);
      throw new InternalServerErrorException('Failed to save capacity information. Please try again.');
    }
  }

  @Mutation(() => Boolean)
  async completeOnboarding(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string
  ): Promise<boolean> {
    try {
      this.logger.log(`Completing onboarding for org ${organizationId}`);
      await this.onboardingService.completeOnboarding(organizationId);
      return true;
    } catch (error) {
      this.logger.error(`Failed to complete onboarding for org ${organizationId}:`, error);
      throw new InternalServerErrorException('Failed to complete onboarding. Please try again.');
    }
  }

  @Query(() => QualityScoreOutput)
  async getQualityScore(@Args('organizationId') organizationId: string): Promise<QualityScoreOutput> {
    try {
      this.logger.log(`Getting quality score for org ${organizationId}`);
      return this.qualityScorer.calculateScore(organizationId);
    } catch (error) {
      this.logger.error(`Failed to get quality score for org ${organizationId}:`, error);
      throw new InternalServerErrorException('Failed to calculate quality score. Please try again.');
    }
  }

  @Query(() => [RecommendationOutput])
  async getOnboardingRecommendations(
    @Args('organizationId') organizationId: string
  ): Promise<RecommendationOutput[]> {
    try {
      this.logger.log(`Getting recommendations for org ${organizationId}`);
      return this.qualityScorer.getRecommendations(organizationId) as any;
    } catch (error) {
      this.logger.error(`Failed to get recommendations for org ${organizationId}:`, error);
      throw new InternalServerErrorException('Failed to get recommendations. Please try again.');
    }
  }

  @Query(() => OnboardingProgressOutput, { nullable: true })
  async getOnboardingStatus(
    @Args('organizationId') organizationId: string
  ): Promise<OnboardingProgressOutput | null> {
    try {
      this.logger.log(`Getting onboarding status for org ${organizationId}`);
      return this.onboardingService.getStatus(organizationId) as any;
    } catch (error) {
      this.logger.error(`Failed to get onboarding status for org ${organizationId}:`, error);
      // Return null for status queries instead of throwing
      return null;
    }
  }

  @Query(() => OrganizationContextOutput, { nullable: true })
  async getOrganizationContext(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string
  ): Promise<OrganizationContextOutput | null> {
    try {
      this.logger.log(`Getting organization context for org ${organizationId}`);
      return this.onboardingService.getContext(organizationId) as any;
    } catch (error) {
      this.logger.error(`Failed to get organization context for org ${organizationId}:`, error);
      // Return null for context queries instead of throwing
      return null;
    }
  }

  @Mutation(() => ExtractionResultOutput)
  async extractFromDocument(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string,
    @Args('documentContent') documentContent: string
  ): Promise<ExtractionResultOutput> {
    try {
      this.logger.log(`Extracting from document for org ${organizationId} (${documentContent.length} chars)`);

      if (!documentContent || documentContent.length === 0) {
        throw new BadRequestException('Document content cannot be empty');
      }

      if (documentContent.length > 10 * 1024 * 1024) {
        throw new BadRequestException('Document content too large. Maximum size is 10MB');
      }

      return this.onboardingAgent.extractOrganizationData(organizationId, documentContent) as any;
    } catch (error) {
      this.logger.error(`Failed to extract from document for org ${organizationId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to extract data from document. Please try again.');
    }
  }

  @Mutation(() => ExtractionResultOutput)
  async extractFromWebsite(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string,
    @Args('websiteUrl') websiteUrl: string
  ): Promise<ExtractionResultOutput> {
    try {
      this.logger.log(`Extracting from website ${websiteUrl} for org ${organizationId}`);

      if (!websiteUrl || websiteUrl.length === 0) {
        throw new BadRequestException('Website URL cannot be empty');
      }

      // Basic URL validation
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(websiteUrl)) {
        throw new BadRequestException('Invalid website URL. Must start with http:// or https://');
      }

      return this.onboardingAgent.extractFromWebsite(organizationId, websiteUrl) as any;
    } catch (error) {
      this.logger.error(`Failed to extract from website ${websiteUrl} for org ${organizationId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to extract data from website. Please try again.');
    }
  }

  @Mutation(() => OnboardingProgressOutput)
  async updateOnboardingProgress(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string,
    @Args('currentStep') currentStep: number
  ): Promise<OnboardingProgressOutput> {
    try {
      this.logger.log(`Updating onboarding progress for org ${organizationId} to step ${currentStep}`);

      if (currentStep < 0 || currentStep > 7) {
        throw new BadRequestException('Invalid step number. Must be between 0 and 7');
      }

      return this.onboardingService.updateCurrentStep(organizationId, currentStep) as any;
    } catch (error) {
      this.logger.error(`Failed to update onboarding progress for org ${organizationId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update onboarding progress. Please try again.');
    }
  }
}
