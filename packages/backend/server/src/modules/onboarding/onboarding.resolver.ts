import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
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
    this.logger.log(`User ${user.id} starting onboarding for org ${organizationId}`);
    return this.onboardingService.startOnboarding(user.id, organizationId) as any;
  }

  @Mutation(() => Boolean)
  async saveBasicInfo(
    @CurrentUser() user: { id: string },
    @Args('input') input: BasicInfoInput
  ): Promise<boolean> {
    this.logger.log(`Saving basic info for org ${input.organizationId}`);
    await this.onboardingService.saveBasicInfo(input.organizationId, input);
    return true;
  }

  @Mutation(() => Boolean)
  async saveMission(
    @CurrentUser() user: { id: string },
    @Args('input') input: MissionInput
  ): Promise<boolean> {
    this.logger.log(`Saving mission for org ${input.organizationId}`);
    await this.onboardingService.saveMission(input.organizationId, input);
    return true;
  }

  @Mutation(() => Boolean)
  async saveNeeds(
    @CurrentUser() user: { id: string },
    @Args('input') input: SaveNeedsInput
  ): Promise<boolean> {
    this.logger.log(`Saving needs for org ${input.organizationId}`);
    await this.onboardingService.saveNeeds(input.organizationId, input);
    return true;
  }

  @Mutation(() => Boolean)
  async addProgram(
    @CurrentUser() user: { id: string },
    @Args('input') input: ProgramInput
  ): Promise<boolean> {
    this.logger.log(`Adding program for org ${input.organizationId}`);
    await this.onboardingService.addProgram(input.organizationId, input);
    return true;
  }

  @Mutation(() => Boolean)
  async saveCapacity(
    @CurrentUser() user: { id: string },
    @Args('input') input: CapacityInput
  ): Promise<boolean> {
    this.logger.log(`Saving capacity for org ${input.organizationId}`);
    await this.onboardingService.saveCapacity(input.organizationId, input);
    return true;
  }

  @Mutation(() => Boolean)
  async completeOnboarding(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string
  ): Promise<boolean> {
    this.logger.log(`Completing onboarding for org ${organizationId}`);
    await this.onboardingService.completeOnboarding(organizationId);
    return true;
  }

  @Query(() => QualityScoreOutput)
  async getQualityScore(@Args('organizationId') organizationId: string): Promise<QualityScoreOutput> {
    this.logger.log(`Getting quality score for org ${organizationId}`);
    return this.qualityScorer.calculateScore(organizationId);
  }

  @Query(() => [RecommendationOutput])
  async getOnboardingRecommendations(
    @Args('organizationId') organizationId: string
  ): Promise<RecommendationOutput[]> {
    this.logger.log(`Getting recommendations for org ${organizationId}`);
    return this.qualityScorer.getRecommendations(organizationId) as any;
  }

  @Query(() => OnboardingProgressOutput, { nullable: true })
  async getOnboardingStatus(
    @Args('organizationId') organizationId: string
  ): Promise<OnboardingProgressOutput | null> {
    this.logger.log(`Getting onboarding status for org ${organizationId}`);
    return this.onboardingService.getStatus(organizationId) as any;
  }

  @Mutation(() => ExtractionResultOutput)
  async extractFromDocument(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string,
    @Args('documentContent') documentContent: string
  ): Promise<ExtractionResultOutput> {
    this.logger.log(`Extracting from document for org ${organizationId} (${documentContent.length} chars)`);
    return this.onboardingAgent.extractOrganizationData(organizationId, documentContent) as any;
  }

  @Mutation(() => ExtractionResultOutput)
  async extractFromWebsite(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string,
    @Args('websiteUrl') websiteUrl: string
  ): Promise<ExtractionResultOutput> {
    this.logger.log(`Extracting from website ${websiteUrl} for org ${organizationId}`);
    return this.onboardingAgent.extractFromWebsite(organizationId, websiteUrl) as any;
  }

  @Mutation(() => OnboardingProgressOutput)
  async updateOnboardingProgress(
    @CurrentUser() user: { id: string },
    @Args('organizationId') organizationId: string,
    @Args('currentStep') currentStep: number
  ): Promise<OnboardingProgressOutput> {
    this.logger.log(`Updating onboarding progress for org ${organizationId} to step ${currentStep}`);
    return this.onboardingService.updateCurrentStep(organizationId, currentStep) as any;
  }
}
