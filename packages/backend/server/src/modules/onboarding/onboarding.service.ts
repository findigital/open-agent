import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { QualityScorerService } from './quality-scorer.service';

export interface BasicInfoInput {
  name: string;
  legalName?: string;
  taxId: string;
  type: string;
  yearFounded: number;
  websiteUrl?: string;
  email: string;
  phone?: string;
  address: string;
}

export interface MissionInput {
  mission: string;
  vision?: string;
  values?: string[];
  focusAreas: string[];
  geographicScope?: string;
  targetPopulation?: string;
  annualBudget?: string;
}

export interface ProgramInput {
  name: string;
  description: string;
  targetPopulation?: string;
  participantsServed?: number;
  outcomes?: string[];
  budget?: number;
}

export interface CapacityInput {
  staffCount?: number;
  fullTimeStaff?: number;
  partTimeStaff?: number;
  volunteers?: number;
  boardCount?: number;
  leadership?: Record<string, any>;
  totalRevenue?: number;
  totalExpenses?: number;
  programExpensePct?: number;
  adminExpensePct?: number;
  fundingSources?: Record<string, any>;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private qualityScorer: QualityScorerService
  ) {}

  /**
   * Start onboarding for an organization
   */
  async startOnboarding(userId: string, organizationId: string) {
    // Check if onboarding already exists
    const existing = await this.prisma.onboardingProgress.findUnique({
      where: { organizationId },
    });

    if (existing && existing.isComplete) {
      throw new BadRequestException('Onboarding already completed');
    }

    if (existing) {
      return existing; // Resume existing onboarding
    }

    // Create onboarding progress
    const progress = await this.prisma.onboardingProgress.create({
      data: {
        organizationId,
        userId,
        currentStep: 1,
        completedSteps: [],
        qualityScore: 0,
        isComplete: false,
      },
    });

    // Create empty organization context
    await this.prisma.organizationContext.create({
      data: {
        organizationId,
        values: [],
        focusAreas: [],
        programs: [],
        impactMetrics: [],
        successStories: [],
      },
    });

    this.logger.log(`Started onboarding for organization ${organizationId}`);

    return progress;
  }

  /**
   * Save basic organization information (Step 1)
   */
  async saveBasicInfo(organizationId: string, input: BasicInfoInput) {
    // Update organization
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: input.name,
        taxId: input.taxId,
        type: input.type,
      },
    });

    // Update organization context
    const context = await this.prisma.organizationContext.findUnique({
      where: { organizationId },
    });

    if (context) {
      await this.prisma.organizationContext.update({
        where: { organizationId },
        data: {
          yearFounded: input.yearFounded,
        },
      });
    }

    // Update onboarding progress
    await this.updateProgress(organizationId, 1, 2);

    this.logger.log(`Saved basic info for organization ${organizationId}`);
  }

  /**
   * Save mission and impact information (Step 2)
   */
  async saveMission(organizationId: string, input: MissionInput) {
    await this.prisma.organizationContext.update({
      where: { organizationId },
      data: {
        mission: input.mission,
        vision: input.vision,
        values: input.values || [],
        focusAreas: input.focusAreas,
        geographicScope: input.geographicScope,
        targetPopulation: input.targetPopulation,
        annualBudget: input.annualBudget,
      },
    });

    // Recalculate quality score
    await this.qualityScorer.calculateScore(organizationId);

    // Update progress
    await this.updateProgress(organizationId, 2, 3);

    this.logger.log(`Saved mission for organization ${organizationId}`);
  }

  /**
   * Add a program (Step 3)
   */
  async addProgram(organizationId: string, input: ProgramInput) {
    const context = await this.prisma.organizationContext.findUnique({
      where: { organizationId },
    });

    if (!context) {
      throw new NotFoundException('Organization context not found');
    }

    const programs = (context.programs as any[]) || [];

    programs.push({
      id: `program-${Date.now()}`,
      name: input.name,
      description: input.description,
      targetPopulation: input.targetPopulation,
      participantsServed: input.participantsServed,
      outcomes: input.outcomes || [],
      budget: input.budget,
      createdAt: new Date().toISOString(),
    });

    await this.prisma.organizationContext.update({
      where: { organizationId },
      data: {
        programs,
      },
    });

    // Recalculate quality score
    await this.qualityScorer.calculateScore(organizationId);

    this.logger.log(`Added program for organization ${organizationId}`);

    return programs;
  }

  /**
   * Update programs (bulk)
   */
  async updatePrograms(organizationId: string, programs: ProgramInput[]) {
    await this.prisma.organizationContext.update({
      where: { organizationId },
      data: {
        programs: programs.map((p, idx) => ({
          id: `program-${idx}`,
          ...p,
          createdAt: new Date().toISOString(),
        })),
      },
    });

    // Recalculate quality score
    await this.qualityScorer.calculateScore(organizationId);

    // Update progress
    await this.updateProgress(organizationId, 3, 4);

    this.logger.log(`Updated programs for organization ${organizationId}`);
  }

  /**
   * Save capacity information (Step 4)
   */
  async saveCapacity(organizationId: string, input: CapacityInput) {
    await this.prisma.organizationContext.update({
      where: { organizationId },
      data: {
        staffCount: input.staffCount,
        fullTimeStaff: input.fullTimeStaff,
        partTimeStaff: input.partTimeStaff,
        volunteers: input.volunteers,
        boardCount: input.boardCount,
        leadership: input.leadership || {},
        totalRevenue: input.totalRevenue,
        totalExpenses: input.totalExpenses,
        programExpensePct: input.programExpensePct,
        adminExpensePct: input.adminExpensePct,
        fundingSourcesJson: input.fundingSources || {},
      },
    });

    // Recalculate quality score
    await this.qualityScorer.calculateScore(organizationId);

    // Update progress
    await this.updateProgress(organizationId, 4, 5);

    this.logger.log(`Saved capacity for organization ${organizationId}`);
  }

  /**
   * Complete onboarding (Step 5)
   */
  async completeOnboarding(organizationId: string) {
    // Final quality score calculation
    const score = await this.qualityScorer.calculateScore(organizationId);

    // Mark as complete
    await this.prisma.onboardingProgress.update({
      where: { organizationId },
      data: {
        isComplete: true,
        completedAt: new Date(),
        qualityScore: score.overall,
      },
    });

    this.logger.log(
      `Completed onboarding for organization ${organizationId} with score ${score.overall}/100`
    );

    return {
      completed: true,
      qualityScore: score,
    };
  }

  /**
   * Get onboarding status
   */
  async getStatus(organizationId: string) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { organizationId },
    });

    if (!progress) {
      return {
        started: false,
        currentStep: 0,
        qualityScore: 0,
        isComplete: false,
      };
    }

    const qualityScore = await this.qualityScorer.calculateScore(organizationId);
    const recommendations = await this.qualityScorer.getRecommendations(organizationId);

    return {
      started: true,
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      qualityScore,
      isComplete: progress.isComplete,
      completedAt: progress.completedAt,
      recommendations,
    };
  }

  /**
   * Get organization context
   */
  async getContext(organizationId: string) {
    return await this.prisma.organizationContext.findUnique({
      where: { organizationId },
    });
  }

  /**
   * Update onboarding progress
   */
  private async updateProgress(
    organizationId: string,
    completedStep: number,
    nextStep: number
  ) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { organizationId },
    });

    if (!progress) {
      throw new NotFoundException('Onboarding progress not found');
    }

    const completedSteps = (progress.completedSteps as number[]) || [];
    if (!completedSteps.includes(completedStep)) {
      completedSteps.push(completedStep);
    }

    await this.prisma.onboardingProgress.update({
      where: { organizationId },
      data: {
        currentStep: nextStep,
        completedSteps,
      },
    });
  }

  /**
   * Skip a step (allow users to come back later)
   */
  async skipStep(organizationId: string, currentStep: number) {
    await this.prisma.onboardingProgress.update({
      where: { organizationId },
      data: {
        currentStep: currentStep + 1,
      },
    });

    this.logger.log(`Skipped step ${currentStep} for organization ${organizationId}`);
  }

  /**
   * Add impact metrics
   */
  async addImpactMetrics(organizationId: string, metrics: any[]) {
    const context = await this.prisma.organizationContext.findUnique({
      where: { organizationId },
    });

    if (!context) {
      throw new NotFoundException('Organization context not found');
    }

    const existingMetrics = (context.impactMetrics as any[]) || [];

    await this.prisma.organizationContext.update({
      where: { organizationId },
      data: {
        impactMetrics: [...existingMetrics, ...metrics],
      },
    });

    // Recalculate quality score
    await this.qualityScorer.calculateScore(organizationId);

    this.logger.log(`Added ${metrics.length} impact metrics for organization ${organizationId}`);
  }

  /**
   * Add success stories
   */
  async addSuccessStories(organizationId: string, stories: any[]) {
    const context = await this.prisma.organizationContext.findUnique({
      where: { organizationId },
    });

    if (!context) {
      throw new NotFoundException('Organization context not found');
    }

    const existingStories = (context.successStories as any[]) || [];

    await this.prisma.organizationContext.update({
      where: { organizationId },
      data: {
        successStories: [...existingStories, ...stories],
      },
    });

    // Recalculate quality score
    await this.qualityScorer.calculateScore(organizationId);

    this.logger.log(`Added ${stories.length} success stories for organization ${organizationId}`);
  }
}
