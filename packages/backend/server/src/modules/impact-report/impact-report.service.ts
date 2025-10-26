import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { ImpactReport, ReportStatus } from '@prisma/client';
import { ImpactReportAiService } from './impact-report-ai.service';

/**
 * DTOs for Impact Report Operations
 */
export class CreateImpactReportInput {
  awardId: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
}

export class UpdateImpactReportInput {
  reportingPeriodStart?: string;
  reportingPeriodEnd?: string;
  status?: ReportStatus;
  peopleServed?: number;
  programsDelivered?: number;
  outcomesAchieved?: any; // JSON
  challenges?: string;
  successes?: string;
  storiesOfImpact?: string;
  lessonsLearned?: string;
  financialSummary?: any; // JSON
}

export class EnhanceNarrativeInput {
  reportId: string;
  section: 'challenges' | 'successes' | 'storiesOfImpact' | 'lessonsLearned';
  currentText: string;
}

export class SubmitReportInput {
  reportId: string;
  recipientEmail?: string;
  message?: string;
}

/**
 * ImpactReportService
 *
 * Handles impact report creation, editing, AI enhancement, and submission.
 * Provides a guided wizard experience for creating compelling impact narratives.
 */
@Injectable()
export class ImpactReportService {
  private readonly logger = new Logger(ImpactReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService,
    private readonly aiService: ImpactReportAiService,
  ) {}

  /**
   * Create a new impact report (in DRAFT status)
   */
  async createReport(
    userId: string,
    input: CreateImpactReportInput,
  ): Promise<ImpactReport> {
    // Verify award exists and user has access
    const award = await this.prisma.grantAward.findUnique({
      where: { id: input.awardId },
      include: {
        proposal: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!award) {
      throw new NotFoundException('Award not found');
    }

    const hasAccess = await this.workspaceService.checkAccess(
      award.proposal.workspaceId,
      userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this award');
    }

    // Create report in DRAFT status
    const report = await this.prisma.impactReport.create({
      data: {
        awardId: input.awardId,
        reportingPeriodStart: new Date(input.reportingPeriodStart),
        reportingPeriodEnd: new Date(input.reportingPeriodEnd),
        status: 'DRAFT',
      },
      include: {
        award: {
          include: {
            proposal: true,
          },
        },
        documents: true,
      },
    });

    this.logger.log(
      `Created impact report ${report.id} for award ${input.awardId}`,
    );

    return report;
  }

  /**
   * Get report by ID with access check
   */
  async findById(reportId: string, userId: string): Promise<ImpactReport> {
    const report = await this.prisma.impactReport.findUnique({
      where: { id: reportId },
      include: {
        award: {
          include: {
            proposal: {
              include: {
                workspace: true,
              },
            },
          },
        },
        documents: {
          include: {
            document: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Impact report not found');
    }

    const hasAccess = await this.workspaceService.checkAccess(
      report.award.proposal.workspaceId,
      userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this report');
    }

    return report;
  }

  /**
   * Get all reports for an award
   */
  async findByAward(
    awardId: string,
    userId: string,
  ): Promise<ImpactReport[]> {
    const award = await this.prisma.grantAward.findUnique({
      where: { id: awardId },
      include: {
        proposal: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!award) {
      throw new NotFoundException('Award not found');
    }

    const hasAccess = await this.workspaceService.checkAccess(
      award.proposal.workspaceId,
      userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this award');
    }

    return this.prisma.impactReport.findMany({
      where: { awardId },
      include: {
        award: {
          include: {
            proposal: true,
          },
        },
        documents: true,
      },
      orderBy: {
        reportingPeriodEnd: 'desc',
      },
    });
  }

  /**
   * Update report (save draft)
   * Allows incremental updates as user progresses through wizard
   */
  async updateReport(
    reportId: string,
    userId: string,
    input: UpdateImpactReportInput,
  ): Promise<ImpactReport> {
    const report = await this.findById(reportId, userId);

    // Only allow updates to DRAFT or NEEDS_REVISION reports
    if (!['DRAFT', 'NEEDS_REVISION'].includes(report.status)) {
      throw new BadRequestException(
        'Can only update reports in DRAFT or NEEDS_REVISION status',
      );
    }

    const updateData: any = {};

    if (input.reportingPeriodStart) {
      updateData.reportingPeriodStart = new Date(input.reportingPeriodStart);
    }
    if (input.reportingPeriodEnd) {
      updateData.reportingPeriodEnd = new Date(input.reportingPeriodEnd);
    }
    if (input.status) {
      updateData.status = input.status;
    }
    if (input.peopleServed !== undefined) {
      updateData.peopleServed = input.peopleServed;
    }
    if (input.programsDelivered !== undefined) {
      updateData.programsDelivered = input.programsDelivered;
    }
    if (input.outcomesAchieved !== undefined) {
      updateData.outcomesAchieved = input.outcomesAchieved;
    }
    if (input.challenges !== undefined) {
      updateData.challenges = input.challenges;
    }
    if (input.successes !== undefined) {
      updateData.successes = input.successes;
    }
    if (input.storiesOfImpact !== undefined) {
      updateData.storiesOfImpact = input.storiesOfImpact;
    }
    if (input.lessonsLearned !== undefined) {
      updateData.lessonsLearned = input.lessonsLearned;
    }
    if (input.financialSummary !== undefined) {
      updateData.financialSummary = input.financialSummary;
    }

    // Calculate quality score based on completeness
    updateData.qualityScore = this.calculateQualityScore({
      ...report,
      ...updateData,
    });

    const updated = await this.prisma.impactReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        award: {
          include: {
            proposal: true,
          },
        },
        documents: true,
      },
    });

    this.logger.log(
      `Updated impact report ${reportId} (quality: ${updated.qualityScore}%)`,
    );

    return updated;
  }

  /**
   * Calculate quality score (0-100) based on report completeness and depth
   */
  private calculateQualityScore(report: any): number {
    let score = 0;

    // Required fields (40 points)
    if (report.reportingPeriodStart) score += 5;
    if (report.reportingPeriodEnd) score += 5;
    if (report.peopleServed) score += 10;
    if (report.programsDelivered) score += 10;
    if (report.outcomesAchieved && Object.keys(report.outcomesAchieved).length > 0) score += 10;

    // Narrative sections (40 points - 10 each)
    if (report.challenges && report.challenges.length > 100) score += 10;
    if (report.successes && report.successes.length > 100) score += 10;
    if (report.storiesOfImpact && report.storiesOfImpact.length > 150) score += 10;
    if (report.lessonsLearned && report.lessonsLearned.length > 100) score += 10;

    // Financial summary (10 points)
    if (report.financialSummary && Object.keys(report.financialSummary).length > 0) score += 10;

    // Documents (10 points)
    if (report.documents && report.documents.length > 0) score += 10;

    return Math.min(100, score);
  }

  /**
   * Enhance narrative with AI using Claude
   */
  async enhanceNarrative(
    userId: string,
    input: EnhanceNarrativeInput,
  ): Promise<{ originalText: string; enhancedText: string; suggestions: string[] }> {
    const report = await this.findById(input.reportId, userId);

    // Get word count for suggestions
    const wordCount = input.currentText.split(/\s+/).length;

    // Call AI service for enhancement
    const { enhancedText, suggestions: aiSuggestions } = await this.aiService.enhanceNarrative({
      section: input.section,
      currentText: input.currentText,
      reportContext: {
        awardTitle: report.award.proposal.title,
        peopleServed: report.peopleServed || undefined,
        programsDelivered: report.programsDelivered || undefined,
        periodStart: report.reportingPeriodStart,
        periodEnd: report.reportingPeriodEnd,
      },
      organizationContext: {
        name: report.award.proposal.workspace.organization.name,
        mission: report.award.proposal.workspace.organization.mission || undefined,
      },
    });

    // Get additional writing suggestions
    const writingSuggestions = await this.aiService.generateWritingSuggestions({
      section: input.section,
      currentText: input.currentText,
      wordCount,
    });

    // Combine AI suggestions with writing tips
    const allSuggestions = [...aiSuggestions, ...writingSuggestions];

    this.logger.log(
      `Enhanced ${input.section} for report ${input.reportId} using Claude`,
    );

    return {
      originalText: input.currentText,
      enhancedText,
      suggestions: allSuggestions,
    };
  }


  /**
   * Generate AI summary of the entire report using Claude
   */
  async generateSummary(
    reportId: string,
    userId: string,
  ): Promise<string> {
    const report = await this.findById(reportId, userId);

    // Use Claude to create compelling executive summary
    const summary = await this.aiService.generateExecutiveSummary({
      awardTitle: report.award.proposal.title,
      periodStart: report.reportingPeriodStart,
      periodEnd: report.reportingPeriodEnd,
      peopleServed: report.peopleServed || undefined,
      programsDelivered: report.programsDelivered || undefined,
      outcomesAchieved: report.outcomesAchieved || undefined,
      challenges: report.challenges || undefined,
      successes: report.successes || undefined,
      storiesOfImpact: report.storiesOfImpact || undefined,
      lessonsLearned: report.lessonsLearned || undefined,
      organizationName: report.award.proposal.workspace.organization.name,
    });

    // Save the generated summary
    await this.prisma.impactReport.update({
      where: { id: reportId },
      data: { aiGeneratedSummary: summary },
    });

    this.logger.log(`Generated AI summary for report ${reportId} using Claude`);

    return summary;
  }

  /**
   * Submit report (change status to IN_REVIEW or SUBMITTED)
   */
  async submitReport(
    userId: string,
    input: SubmitReportInput,
  ): Promise<ImpactReport> {
    const report = await this.findById(input.reportId, userId);

    // Validate report is complete enough to submit
    if (!report.peopleServed || !report.successes || !report.storiesOfImpact) {
      throw new BadRequestException(
        'Report must include metrics, successes, and impact stories before submission',
      );
    }

    // Update status
    const submitted = await this.prisma.impactReport.update({
      where: { id: input.reportId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        award: {
          include: {
            proposal: true,
          },
        },
        documents: true,
      },
    });

    // TODO: Send email notification to program officer
    // if (input.recipientEmail) {
    //   await this.notificationService.notifyReportSubmitted(
    //     submitted.id,
    //     input.recipientEmail,
    //     input.message
    //   );
    // }

    this.logger.log(
      `Submitted impact report ${input.reportId} for award ${report.awardId}`,
    );

    return submitted;
  }

  /**
   * Link a document to a report
   */
  async linkDocument(
    reportId: string,
    documentId: string,
    userId: string,
  ): Promise<void> {
    const report = await this.findById(reportId, userId);

    // Verify document exists and belongs to same organization
    const document = await this.prisma.organizationDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Create link
    await this.prisma.reportDocument.create({
      data: {
        reportId,
        documentId,
      },
    });

    this.logger.log(`Linked document ${documentId} to report ${reportId}`);
  }

  /**
   * Unlink a document from a report
   */
  async unlinkDocument(
    reportId: string,
    documentId: string,
    userId: string,
  ): Promise<void> {
    await this.findById(reportId, userId); // Access check

    await this.prisma.reportDocument.deleteMany({
      where: {
        reportId,
        documentId,
      },
    });

    this.logger.log(`Unlinked document ${documentId} from report ${reportId}`);
  }

  /**
   * Delete report (only if DRAFT)
   */
  async deleteReport(reportId: string, userId: string): Promise<void> {
    const report = await this.findById(reportId, userId);

    if (report.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete reports in DRAFT status');
    }

    await this.prisma.impactReport.delete({
      where: { id: reportId },
    });

    this.logger.log(`Deleted impact report ${reportId}`);
  }

  /**
   * Helper: Format date for display
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Get report statistics for an organization
   */
  async getOrganizationStats(
    organizationId: string,
    userId: string,
  ): Promise<{
    totalReports: number;
    draftReports: number;
    submittedReports: number;
    averageQualityScore: number;
  }> {
    // Verify user has access to organization
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
    });

    if (!member) {
      throw new ForbiddenException('Access denied to this organization');
    }

    // Get all reports for this organization
    const reports = await this.prisma.impactReport.findMany({
      where: {
        award: {
          proposal: {
            workspace: {
              organizationId,
            },
          },
        },
      },
    });

    const totalReports = reports.length;
    const draftReports = reports.filter((r) => r.status === 'DRAFT').length;
    const submittedReports = reports.filter((r) =>
      ['SUBMITTED', 'ACCEPTED'].includes(r.status),
    ).length;

    const qualityScores = reports
      .filter((r) => r.qualityScore !== null)
      .map((r) => r.qualityScore!);

    const averageQualityScore =
      qualityScores.length > 0
        ? Math.round(
            qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length,
          )
        : 0;

    return {
      totalReports,
      draftReports,
      submittedReports,
      averageQualityScore,
    };
  }
}
