import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AwardService } from './award.service';
import { CreateAwardInput } from './dto/create-award.input';
import { AddRequirementInput } from './dto/add-requirement.input';
import { UpdateRequirementInput } from './dto/update-requirement.input';
import { GrantAward, ComplianceRequirement } from '@prisma/client';

// Placeholder guard
const AuthGuard = function () {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return descriptor;
  };
};

@Resolver('GrantAward')
@UseGuards(AuthGuard)
export class AwardResolver {
  constructor(private awardService: AwardService) {}

  // ============================================================================
  // Queries
  // ============================================================================

  @Query('awardByProposal')
  async awardByProposal(
    @Args('proposalId') proposalId: string,
    @Context() context: any,
  ): Promise<GrantAward | null> {
    const userId = context.req.user.id;
    return this.awardService.findByProposal(proposalId, userId);
  }

  @Query('award')
  async award(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<GrantAward> {
    const userId = context.req.user.id;
    return this.awardService.findById(id, userId);
  }

  @Query('activeAwards')
  async activeAwards(
    @Args('organizationId') organizationId: string,
    @Context() context: any,
  ): Promise<GrantAward[]> {
    const userId = context.req.user.id;
    return this.awardService.findActiveByOrganization(organizationId, userId);
  }

  @Query('upcomingDeadlines')
  async upcomingDeadlines(
    @Args('organizationId') organizationId: string,
    @Args('days') days: number,
    @Context() context: any,
  ): Promise<ComplianceRequirement[]> {
    const userId = context.req.user.id;
    return this.awardService.getUpcomingDeadlines(organizationId, userId, days);
  }

  @Query('overdueRequirements')
  async overdueRequirements(
    @Args('organizationId') organizationId: string,
    @Context() context: any,
  ): Promise<ComplianceRequirement[]> {
    const userId = context.req.user.id;
    return this.awardService.getOverdueRequirements(organizationId, userId);
  }

  // ============================================================================
  // Mutations
  // ============================================================================

  @Mutation('createAward')
  async createAward(
    @Args('input') input: CreateAwardInput,
    @Context() context: any,
  ): Promise<GrantAward> {
    const userId = context.req.user.id;
    return this.awardService.createAward(userId, input);
  }

  @Mutation('addComplianceRequirement')
  async addComplianceRequirement(
    @Args('input') input: AddRequirementInput,
    @Context() context: any,
  ): Promise<ComplianceRequirement> {
    const userId = context.req.user.id;
    return this.awardService.addRequirement(userId, input);
  }

  @Mutation('updateComplianceRequirement')
  async updateComplianceRequirement(
    @Args('id') id: string,
    @Args('input') input: UpdateRequirementInput,
    @Context() context: any,
  ): Promise<ComplianceRequirement> {
    const userId = context.req.user.id;
    return this.awardService.updateRequirement(id, userId, input);
  }

  @Mutation('linkDocumentToRequirement')
  async linkDocumentToRequirement(
    @Args('requirementId') requirementId: string,
    @Args('documentId') documentId: string,
    @Context() context: any,
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.awardService.linkDocumentToRequirement(requirementId, documentId, userId);
  }
}
