import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../base/auth/session.guard';
import {
  ImpactReportService,
  CreateImpactReportInput,
  UpdateImpactReportInput,
  EnhanceNarrativeInput,
  SubmitReportInput,
} from './impact-report.service';
import { ImpactReport } from '@prisma/client';

/**
 * ImpactReportResolver
 *
 * GraphQL API for impact report operations
 */
@Resolver('ImpactReport')
@UseGuards(AuthGuard)
export class ImpactReportResolver {
  constructor(private readonly impactReportService: ImpactReportService) {}

  /**
   * QUERIES
   */

  @Query('impactReport')
  async impactReport(
    @Args('reportId') reportId: string,
    @Context() context: any,
  ): Promise<ImpactReport> {
    const userId = context.req.user.id;
    return this.impactReportService.findById(reportId, userId);
  }

  @Query('impactReportsByAward')
  async impactReportsByAward(
    @Args('awardId') awardId: string,
    @Context() context: any,
  ): Promise<ImpactReport[]> {
    const userId = context.req.user.id;
    return this.impactReportService.findByAward(awardId, userId);
  }

  @Query('impactReportStats')
  async impactReportStats(
    @Args('organizationId') organizationId: string,
    @Context() context: any,
  ): Promise<{
    totalReports: number;
    draftReports: number;
    submittedReports: number;
    averageQualityScore: number;
  }> {
    const userId = context.req.user.id;
    return this.impactReportService.getOrganizationStats(organizationId, userId);
  }

  /**
   * MUTATIONS
   */

  @Mutation('createImpactReport')
  async createImpactReport(
    @Args('input') input: CreateImpactReportInput,
    @Context() context: any,
  ): Promise<ImpactReport> {
    const userId = context.req.user.id;
    return this.impactReportService.createReport(userId, input);
  }

  @Mutation('updateImpactReport')
  async updateImpactReport(
    @Args('reportId') reportId: string,
    @Args('input') input: UpdateImpactReportInput,
    @Context() context: any,
  ): Promise<ImpactReport> {
    const userId = context.req.user.id;
    return this.impactReportService.updateReport(reportId, userId, input);
  }

  @Mutation('enhanceNarrative')
  async enhanceNarrative(
    @Args('input') input: EnhanceNarrativeInput,
    @Context() context: any,
  ): Promise<{ originalText: string; enhancedText: string; suggestions: string[] }> {
    const userId = context.req.user.id;
    return this.impactReportService.enhanceNarrative(userId, input);
  }

  @Mutation('generateReportSummary')
  async generateReportSummary(
    @Args('reportId') reportId: string,
    @Context() context: any,
  ): Promise<string> {
    const userId = context.req.user.id;
    return this.impactReportService.generateSummary(reportId, userId);
  }

  @Mutation('submitImpactReport')
  async submitImpactReport(
    @Args('input') input: SubmitReportInput,
    @Context() context: any,
  ): Promise<ImpactReport> {
    const userId = context.req.user.id;
    return this.impactReportService.submitReport(userId, input);
  }

  @Mutation('linkDocumentToReport')
  async linkDocumentToReport(
    @Args('reportId') reportId: string,
    @Args('documentId') documentId: string,
    @Context() context: any,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    await this.impactReportService.linkDocument(reportId, documentId, userId);
    return true;
  }

  @Mutation('unlinkDocumentFromReport')
  async unlinkDocumentFromReport(
    @Args('reportId') reportId: string,
    @Args('documentId') documentId: string,
    @Context() context: any,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    await this.impactReportService.unlinkDocument(reportId, documentId, userId);
    return true;
  }

  @Mutation('deleteImpactReport')
  async deleteImpactReport(
    @Args('reportId') reportId: string,
    @Context() context: any,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    await this.impactReportService.deleteReport(reportId, userId);
    return true;
  }
}
