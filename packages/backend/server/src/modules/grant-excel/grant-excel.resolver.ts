import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../base/auth/session.guard';
import { GrantExcelService } from './grant-excel.service';

/**
 * GrantExcelResolver
 *
 * GraphQL API for Excel export operations
 */
@Resolver('GrantExcel')
@UseGuards(AuthGuard)
export class GrantExcelResolver {
  constructor(private readonly excelService: GrantExcelService) {}

  @Mutation('exportGrantPortfolioExcel')
  async exportGrantPortfolioExcel(
    @Args('organizationId') organizationId: string,
    @Context() context: any,
  ): Promise<string> {
    const userId = context.req.user.id;
    return this.excelService.exportGrantPortfolio(organizationId, userId);
  }

  @Mutation('exportBudgetTemplateExcel')
  async exportBudgetTemplateExcel(
    @Args('proposalId') proposalId: string,
    @Context() context: any,
  ): Promise<string> {
    const userId = context.req.user.id;
    return this.excelService.exportBudgetTemplate(proposalId, userId);
  }
}
