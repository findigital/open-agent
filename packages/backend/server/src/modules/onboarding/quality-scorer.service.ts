import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { OrganizationContext } from '@prisma/client';

export interface QualityScore {
  identity: number;
  needs: number;
  programs: number;
  capacity: number;
  impact: number;
  overall: number;
}

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  benefit: string;
  pointsGain: number;
  estimatedTime: string;
  category: 'identity' | 'programs' | 'capacity' | 'impact';
}

@Injectable()
export class QualityScorerService {
  private readonly logger = new Logger(QualityScorerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate overall quality score for an organization
   */
  async calculateScore(organizationId: string): Promise<QualityScore> {
    const context = await this.prisma.organizationContext.findUnique({
      where: { organizationId },
    });

    if (!context) {
      // Return zeros if no context exists yet
      return {
        identity: 0,
        needs: 0,
        programs: 0,
        capacity: 0,
        impact: 0,
        overall: 0,
      };
    }

    const identityScore = this.calculateIdentityScore(context);
    const needsScore = this.calculateNeedsScore(context);
    const programsScore = this.calculateProgramsScore(context);
    const capacityScore = this.calculateCapacityScore(context);
    const impactScore = this.calculateImpactScore(context);

    // Weighted calculation: Identity 25%, Needs 25%, Programs 30%, Capacity 15%, Impact 5%
    const overallScore = Math.round(
      identityScore * 0.25 + needsScore * 0.25 + programsScore * 0.30 + capacityScore * 0.15 + impactScore * 0.05
    );

    // Update scores in database
    await this.prisma.organizationContext.update({
      where: { organizationId },
      data: {
        identityScore,
        needsScore,
        programsScore,
        capacityScore,
        impactScore,
        overallScore,
      },
    });

    this.logger.log(`Quality score calculated for ${organizationId}: ${overallScore}/100`);

    return {
      identity: identityScore,
      needs: needsScore,
      programs: programsScore,
      capacity: capacityScore,
      impact: impactScore,
      overall: overallScore,
    };
  }

  /**
   * Calculate Identity Score (0-100)
   * Components:
   * - Mission statement: 40 points
   * - Vision statement: 15 points
   * - Focus areas (≥3): 20 points
   * - Geographic scope: 10 points
   * - Target population: 15 points
   */
  private calculateIdentityScore(context: OrganizationContext): number {
    let score = 0;

    if (context.mission && context.mission.length > 20) {
      score += 40;
    }

    if (context.vision && context.vision.length > 15) {
      score += 15;
    }

    if (context.focusAreas && context.focusAreas.length >= 3) {
      score += 20;
    } else if (context.focusAreas && context.focusAreas.length > 0) {
      // Partial credit
      score += Math.round((context.focusAreas.length / 3) * 20);
    }

    if (context.geographicScope) {
      score += 10;
    }

    if (context.targetPopulation && context.targetPopulation.length > 20) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate Needs Score (0-100)
   * Components:
   * - Primary need/problem statement: 40 points
   * - Need statement includes data/statistics: +20 points
   * - Supporting evidence (≥2 data points): 15 points
   * - Organization's unique approach: 10 points
   * - Gap analysis: 10 points
   * - Community impact without org: 5 points
   * - Bonus: Multiple sources, recent data
   */
  private calculateNeedsScore(context: OrganizationContext): number {
    let score = 0;

    // Primary need/problem statement exists: 40 points
    if (context.primaryNeed && context.primaryNeed.length > 50) {
      score += 40;

      // Need statement includes specific data/statistics: +20 points
      if (this.containsQuantifiableData(context.primaryNeed)) {
        score += 20;
      }
    }

    // Supporting evidence with sources (≥2 data points): 15 points
    const evidence = (context.needEvidence as any[]) || [];
    if (evidence.length >= 2) {
      score += 15;
    } else if (evidence.length === 1) {
      score += 8; // Partial credit
    }

    // Organization's unique approach defined: 10 points
    if (context.uniqueApproach && context.uniqueApproach.length > 30) {
      score += 10;
    }

    // Gap analysis (why existing solutions inadequate): 10 points
    if (context.gapsInSolutions && context.gapsInSolutions.length > 30) {
      score += 10;
    }

    // Community impact without organization stated: 5 points
    if (context.impactWithoutOrg && context.impactWithoutOrg.length > 20) {
      score += 5;
    }

    // Bonus points
    if (evidence.length > 2) score += 5; // Multiple sources
    if (this.hasRecentData(evidence)) score += 5; // Recent data

    return Math.min(score, 100);
  }

  /**
   * Check if text contains quantifiable data (numbers, percentages, statistics)
   */
  private containsQuantifiableData(text: string): boolean {
    // Check if text contains numbers/percentages
    return /\d+%|\d+\s*(percent|people|students|families|children|youth|individuals)/i.test(text);
  }

  /**
   * Check if evidence contains recent data (within 3 years)
   */
  private hasRecentData(evidence: any[]): boolean {
    const currentYear = new Date().getFullYear();
    return evidence.some((e) => e.year && e.year >= currentYear - 3);
  }

  /**
   * Calculate Programs Score (0-100)
   * Components:
   * - At least 1 program: 30 points
   * - 2-3 programs: +20 points
   * - 4+ programs: +30 points
   * - Impact metrics per program: +10 points each (max 30)
   * - Success stories: +10 points each (max 30)
   */
  private calculateProgramsScore(context: OrganizationContext): number {
    let score = 0;

    const programs = (context.programs as any[]) || [];
    const programCount = programs.length;

    if (programCount >= 1) {
      score += 30;
    }

    if (programCount >= 2 && programCount <= 3) {
      score += 20;
    } else if (programCount >= 4) {
      score += 30;
    }

    // Impact metrics
    const impactMetrics = (context.impactMetrics as any[]) || [];
    const metricsScore = Math.min(impactMetrics.length * 10, 30);
    score += metricsScore;

    // Success stories
    const successStories = (context.successStories as any[]) || [];
    const storiesScore = Math.min(successStories.length * 10, 30);
    score += storiesScore;

    return Math.min(score, 100);
  }

  /**
   * Calculate Capacity Score (0-100)
   * Components:
   * - Staff count: 20 points
   * - Leadership team: 25 points
   * - Board info: 15 points
   * - Financial data (1 year): 20 points
   * - Financial data (3 years): +20 points
   */
  private calculateCapacityScore(context: OrganizationContext): number {
    let score = 0;

    if (context.staffCount && context.staffCount > 0) {
      score += 20;
    }

    const leadership = (context.leadership as any) || null;
    if (leadership && Object.keys(leadership).length > 0) {
      score += 25;
    }

    if (context.boardCount && context.boardCount > 0) {
      score += 15;
    }

    // Financial data
    if (context.totalRevenue || context.totalExpenses) {
      score += 20;
    }

    // Check if we have comprehensive financial data (multiple years, expense breakdowns)
    if (
      context.totalRevenue &&
      context.totalExpenses &&
      context.programExpensePct &&
      context.adminExpensePct
    ) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate Impact Score (0-100)
   * Components:
   * - Quantified outcomes (≥5): 40 points
   * - Success stories (≥3): 30 points
   * - External validation: 20 points
   * - Evaluation reports: 10 points
   */
  private calculateImpactScore(context: OrganizationContext): number {
    let score = 0;

    const impactMetrics = (context.impactMetrics as any[]) || [];
    if (impactMetrics.length >= 5) {
      score += 40;
    } else if (impactMetrics.length > 0) {
      // Partial credit
      score += Math.round((impactMetrics.length / 5) * 40);
    }

    const successStories = (context.successStories as any[]) || [];
    if (successStories.length >= 3) {
      score += 30;
    } else if (successStories.length > 0) {
      // Partial credit
      score += Math.round((successStories.length / 3) * 30);
    }

    // Check for external validation (awards, certifications, etc.)
    const hasExternalValidation = successStories.some(
      (story: any) => story.source === 'external' || story.type === 'award'
    );
    if (hasExternalValidation) {
      score += 20;
    }

    // Check for evaluation reports in impact metrics
    const hasEvaluationData = impactMetrics.some(
      (metric: any) => metric.source === 'evaluation' || metric.verified === true
    );
    if (hasEvaluationData) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Generate personalized recommendations to improve quality score
   */
  async getRecommendations(organizationId: string): Promise<Recommendation[]> {
    const context = await this.prisma.organizationContext.findUnique({
      where: { organizationId },
    });

    if (!context) {
      return this.getDefaultRecommendations();
    }

    const recommendations: Recommendation[] = [];

    // Check identity components
    if (!context.mission) {
      recommendations.push({
        priority: 'critical',
        action: 'Add your mission statement',
        benefit: 'Essential for all grant proposals',
        pointsGain: 40,
        estimatedTime: '2 minutes',
        category: 'identity',
      });
    }

    if (!context.vision) {
      recommendations.push({
        priority: 'high',
        action: 'Add your vision statement',
        benefit: 'Shows your long-term aspirations to funders',
        pointsGain: 15,
        estimatedTime: '2 minutes',
        category: 'identity',
      });
    }

    if (!context.focusAreas || context.focusAreas.length < 3) {
      recommendations.push({
        priority: 'high',
        action: 'Define at least 3 focus areas',
        benefit: 'Helps match you with relevant grants',
        pointsGain: 20,
        estimatedTime: '3 minutes',
        category: 'identity',
      });
    }

    if (!context.targetPopulation) {
      recommendations.push({
        priority: 'medium',
        action: 'Describe your target population',
        benefit: 'Demonstrates clear impact focus',
        pointsGain: 15,
        estimatedTime: '3 minutes',
        category: 'identity',
      });
    }

    // Check needs & gaps
    if (!context.primaryNeed) {
      recommendations.push({
        priority: 'critical',
        action: 'Add your primary need/problem statement',
        benefit: 'Foundation of every grant proposal - shows why your work is needed',
        pointsGain: 40,
        estimatedTime: '5 minutes',
        category: 'identity',
      });
    } else if (!this.containsQuantifiableData(context.primaryNeed)) {
      recommendations.push({
        priority: 'high',
        action: 'Add data/statistics to your need statement',
        benefit: 'Quantified needs are much more compelling to funders',
        pointsGain: 20,
        estimatedTime: '3 minutes',
        category: 'identity',
      });
    }

    const evidence = (context.needEvidence as any[]) || [];
    if (evidence.length < 2) {
      recommendations.push({
        priority: 'high',
        action: `Add ${2 - evidence.length} more data points with sources`,
        benefit: 'Evidence-based needs demonstrate urgency and credibility',
        pointsGain: 15,
        estimatedTime: '5 minutes',
        category: 'identity',
      });
    }

    if (!context.uniqueApproach) {
      recommendations.push({
        priority: 'high',
        action: "Describe your organization's unique approach",
        benefit: 'Shows why YOU are the right organization to address this need',
        pointsGain: 10,
        estimatedTime: '3 minutes',
        category: 'identity',
      });
    }

    if (!context.gapsInSolutions) {
      recommendations.push({
        priority: 'medium',
        action: 'Explain gaps in existing solutions',
        benefit: 'Demonstrates why new funding is necessary',
        pointsGain: 10,
        estimatedTime: '3 minutes',
        category: 'identity',
      });
    }

    if (!context.impactWithoutOrg) {
      recommendations.push({
        priority: 'medium',
        action: 'Describe what would happen without your organization',
        benefit: 'Shows the urgency and importance of your work',
        pointsGain: 5,
        estimatedTime: '2 minutes',
        category: 'identity',
      });
    }

    // Check programs
    const programs = (context.programs as any[]) || [];
    if (programs.length === 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Add at least one program description',
        benefit: 'Core to demonstrating your organizational capacity',
        pointsGain: 30,
        estimatedTime: '5 minutes',
        category: 'programs',
      });
    } else if (programs.length < 3) {
      recommendations.push({
        priority: 'medium',
        action: `Add ${3 - programs.length} more program descriptions`,
        benefit: 'Shows breadth of organizational activities',
        pointsGain: 20,
        estimatedTime: '10 minutes',
        category: 'programs',
      });
    }

    const impactMetrics = (context.impactMetrics as any[]) || [];
    if (impactMetrics.length < 5) {
      recommendations.push({
        priority: 'high',
        action: `Add ${5 - impactMetrics.length} more impact metrics`,
        benefit: 'Quantified outcomes are compelling to funders',
        pointsGain: Math.round(((5 - impactMetrics.length) / 5) * 40),
        estimatedTime: '8 minutes',
        category: 'impact',
      });
    }

    const successStories = (context.successStories as any[]) || [];
    if (successStories.length < 3) {
      recommendations.push({
        priority: 'medium',
        action: `Add ${3 - successStories.length} more success stories`,
        benefit: 'Stories make your impact memorable',
        pointsGain: Math.round(((3 - successStories.length) / 3) * 30),
        estimatedTime: '15 minutes',
        category: 'impact',
      });
    }

    // Check capacity
    if (!context.staffCount || context.staffCount === 0) {
      recommendations.push({
        priority: 'high',
        action: 'Add your team size information',
        benefit: 'Demonstrates organizational capacity',
        pointsGain: 20,
        estimatedTime: '2 minutes',
        category: 'capacity',
      });
    }

    if (!context.totalRevenue && !context.totalExpenses) {
      recommendations.push({
        priority: 'high',
        action: 'Upload annual report or add financial data',
        benefit: 'Financial stability is key to grant success',
        pointsGain: 20,
        estimatedTime: '5 minutes',
        category: 'capacity',
      });
    }

    if (!context.boardCount || context.boardCount === 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Add board member count',
        benefit: 'Shows governance structure',
        pointsGain: 15,
        estimatedTime: '1 minute',
        category: 'capacity',
      });
    }

    // Sort by priority and points gain
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.pointsGain - a.pointsGain;
    });

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Get default recommendations for new organizations
   */
  private getDefaultRecommendations(): Recommendation[] {
    return [
      {
        priority: 'critical',
        action: 'Add your mission statement',
        benefit: 'Essential foundation for all proposals',
        pointsGain: 40,
        estimatedTime: '2 minutes',
        category: 'identity',
      },
      {
        priority: 'critical',
        action: 'Upload your annual report',
        benefit: 'Provides comprehensive organizational context',
        pointsGain: 50,
        estimatedTime: '5 minutes',
        category: 'programs',
      },
      {
        priority: 'high',
        action: 'Add program descriptions',
        benefit: 'Core to demonstrating impact',
        pointsGain: 30,
        estimatedTime: '10 minutes',
        category: 'programs',
      },
      {
        priority: 'high',
        action: 'Add team and financial information',
        benefit: 'Shows organizational capacity',
        pointsGain: 40,
        estimatedTime: '5 minutes',
        category: 'capacity',
      },
    ];
  }

  /**
   * Get quality level label based on score
   */
  getQualityLevel(score: number): string {
    if (score >= 91) return 'Outstanding';
    if (score >= 81) return 'Excellent';
    if (score >= 61) return 'Good';
    if (score >= 41) return 'Fair';
    return 'Getting Started';
  }

  /**
   * Get quality level color for UI
   */
  getQualityColor(score: number): string {
    if (score >= 91) return 'green-700';
    if (score >= 81) return 'green-500';
    if (score >= 61) return 'yellow-500';
    if (score >= 41) return 'orange-500';
    return 'red-500';
  }
}
