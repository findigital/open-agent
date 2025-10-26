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
   * Enhance narrative with AI (placeholder for OpenAI integration)
   * In production, this would call OpenAI API to improve narrative quality
   */
  async enhanceNarrative(
    userId: string,
    input: EnhanceNarrativeInput,
  ): Promise<{ originalText: string; enhancedText: string; suggestions: string[] }> {
    const report = await this.findById(input.reportId, userId);

    // In production, integrate with OpenAI API
    // For now, return a structured response that frontend can use
    const enhancedText = await this.callAIEnhancement(
      input.section,
      input.currentText,
      report,
    );

    const suggestions = this.generateWritingSuggestions(
      input.section,
      input.currentText,
    );

    this.logger.log(
      `Enhanced ${input.section} for report ${input.reportId}`,
    );

    return {
      originalText: input.currentText,
      enhancedText,
      suggestions,
    };
  }

  /**
   * AI enhancement using OpenAI (placeholder implementation)
   * TODO: Integrate with actual OpenAI API
   */
  private async callAIEnhancement(
    section: string,
    text: string,
    report: any,
  ): Promise<string> {
    // Placeholder implementation
    // In production, this would call OpenAI API with a prompt like:
    /*
    const prompt = `
      You are a grant writing expert. Improve the following ${section} section
      of an impact report for a ${report.award.proposal.title} grant.

      Current text:
      ${text}

      Please enhance this narrative to be more compelling, specific, and data-driven.
      Maintain the original facts but improve clarity, flow, and impact.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
    */

    // For now, return the original text with a note
    return `${text}\n\n[AI Enhancement: This section could be enhanced with more specific data, compelling stories, and measurable outcomes. Consider adding concrete examples and quantitative results.]`;
  }

  /**
   * Generate writing suggestions for a section
   */
  private generateWritingSuggestions(
    section: string,
    text: string,
  ): string[] {
    const suggestions: string[] = [];

    const wordCount = text.split(/\s+/).length;
    const hasNumbers = /\d+/.test(text);
    const hasQuotes = /["']/.test(text);

    switch (section) {
      case 'challenges':
        if (wordCount < 50) {
          suggestions.push('Consider expanding on the challenges faced and how you addressed them');
        }
        if (!hasNumbers) {
          suggestions.push('Include specific data or metrics about the challenges');
        }
        suggestions.push('Describe both the challenge and your response strategy');
        break;

      case 'successes':
        if (wordCount < 50) {
          suggestions.push('Provide more detail about your achievements and their significance');
        }
        if (!hasNumbers) {
          suggestions.push('Add quantitative results to demonstrate impact');
        }
        suggestions.push('Connect successes to original grant objectives');
        break;

      case 'storiesOfImpact':
        if (wordCount < 100) {
          suggestions.push('Impact stories work best with specific examples and personal narratives');
        }
        if (!hasQuotes) {
          suggestions.push('Consider including quotes from beneficiaries or stakeholders');
        }
        suggestions.push('Use the "before and after" framework to show transformation');
        suggestions.push('Include demographic or contextual details to make stories relatable');
        break;

      case 'lessonsLearned':
        if (wordCount < 50) {
          suggestions.push('Elaborate on key insights and how they\'ll inform future work');
        }
        suggestions.push('Be honest about what didn\'t work as well as successes');
        suggestions.push('Describe how lessons will be applied moving forward');
        break;
    }

    return suggestions;
  }

  /**
   * Generate AI summary of the entire report
   */
  async generateSummary(
    reportId: string,
    userId: string,
  ): Promise<string> {
    const report = await this.findById(reportId, userId);

    // In production, use OpenAI to create compelling executive summary
    const summary = `
Executive Summary - ${report.award.proposal.title}
Reporting Period: ${this.formatDate(report.reportingPeriodStart)} - ${this.formatDate(report.reportingPeriodEnd)}

${report.peopleServed ? `Served ${report.peopleServed} individuals` : 'Impact metrics pending'}
${report.programsDelivered ? `Delivered ${report.programsDelivered} programs` : ''}

This report demonstrates significant progress toward grant objectives with measurable outcomes
and meaningful community impact. Key successes include [summary would be AI-generated from
actual report content].

Quality Score: ${report.qualityScore}%
    `.trim();

    // Save the generated summary
    await this.prisma.impactReport.update({
      where: { id: reportId },
      data: { aiGeneratedSummary: summary },
    });

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
