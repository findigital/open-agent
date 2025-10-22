import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { ProposalSectionService } from './proposal-section.service';
import { ProposalVersionService } from './proposal-version.service';
import { CreateProposalInput } from './dto/create-proposal.input';
import { UpdateProposalInput } from './dto/update-proposal.input';
import { CreateProposalSectionInput } from './dto/create-proposal-section.input';
import { UpdateProposalSectionInput } from './dto/update-proposal-section.input';
import { Proposal, ProposalSection, ProposalVersion, ProposalStatus } from '@prisma/client';

// Placeholder guard - should be imported from auth module
const AuthGuard = function () {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return descriptor;
  };
};

@Resolver('Proposal')
@UseGuards(AuthGuard)
export class ProposalResolver {
  constructor(
    private proposalService: ProposalService,
    private sectionService: ProposalSectionService,
    private versionService: ProposalVersionService
  ) {}

  // ============================================================================
  // Proposal Queries
  // ============================================================================

  @Query('proposal')
  async proposal(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<Proposal | null> {
    const userId = context.req.user.id;
    return this.proposalService.findOne(id, userId);
  }

  @Query('proposals')
  async proposals(
    @Args('workspaceId') workspaceId: string,
    @Args('status') status: ProposalStatus | undefined,
    @Context() context: any
  ): Promise<Proposal[]> {
    const userId = context.req.user.id;
    return this.proposalService.findByWorkspace(workspaceId, userId, status);
  }

  @Query('myProposals')
  async myProposals(
    @Args('status') status: ProposalStatus | undefined,
    @Context() context: any
  ): Promise<Proposal[]> {
    const userId = context.req.user.id;
    return this.proposalService.findByUser(userId, status);
  }

  // ============================================================================
  // Proposal Mutations
  // ============================================================================

  @Mutation('createProposal')
  async createProposal(
    @Args('input') input: CreateProposalInput,
    @Context() context: any
  ): Promise<Proposal> {
    const userId = context.req.user.id;
    return this.proposalService.create(userId, input);
  }

  @Mutation('updateProposal')
  async updateProposal(
    @Args('id') id: string,
    @Args('input') input: UpdateProposalInput,
    @Context() context: any
  ): Promise<Proposal> {
    const userId = context.req.user.id;
    return this.proposalService.update(id, userId, input);
  }

  @Mutation('deleteProposal')
  async deleteProposal(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.proposalService.delete(id, userId);
  }

  @Mutation('updateProposalStatus')
  async updateProposalStatus(
    @Args('id') id: string,
    @Args('status') status: ProposalStatus,
    @Context() context: any
  ): Promise<Proposal> {
    const userId = context.req.user.id;
    return this.proposalService.updateStatus(id, userId, status);
  }

  // ============================================================================
  // Proposal Section Mutations
  // ============================================================================

  @Mutation('createProposalSection')
  async createProposalSection(
    @Args('input') input: CreateProposalSectionInput,
    @Context() context: any
  ): Promise<ProposalSection> {
    const userId = context.req.user.id;
    return this.sectionService.create(userId, input);
  }

  @Mutation('updateProposalSection')
  async updateProposalSection(
    @Args('id') id: string,
    @Args('input') input: UpdateProposalSectionInput,
    @Context() context: any
  ): Promise<ProposalSection> {
    const userId = context.req.user.id;
    return this.sectionService.update(id, userId, input);
  }

  @Mutation('deleteProposalSection')
  async deleteProposalSection(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.sectionService.delete(id, userId);
  }

  @Mutation('reorderProposalSections')
  async reorderProposalSections(
    @Args('proposalId') proposalId: string,
    @Args('sectionIds') sectionIds: string[],
    @Context() context: any
  ): Promise<ProposalSection[]> {
    const userId = context.req.user.id;
    return this.sectionService.reorder(proposalId, userId, sectionIds);
  }

  // ============================================================================
  // Proposal Version Mutations
  // ============================================================================

  @Mutation('createProposalVersion')
  async createProposalVersion(
    @Args('proposalId') proposalId: string,
    @Args('comment') comment: string | undefined,
    @Context() context: any
  ): Promise<ProposalVersion> {
    const userId = context.req.user.id;
    return this.versionService.create(proposalId, userId, comment);
  }

  @Mutation('restoreProposalVersion')
  async restoreProposalVersion(
    @Args('versionId') versionId: string,
    @Context() context: any
  ): Promise<Proposal> {
    const userId = context.req.user.id;
    return this.versionService.restore(versionId, userId);
  }

  // ============================================================================
  // Computed Fields
  // ============================================================================

  @ResolveField('wordCount')
  async wordCount(@Parent() proposal: Proposal): Promise<number> {
    return this.proposalService.getWordCount(proposal.id);
  }

  @ResolveField('completionPercentage')
  async completionPercentage(@Parent() proposal: Proposal): Promise<number> {
    return this.proposalService.getCompletionPercentage(proposal.id);
  }

  @ResolveField('pendingApprovals')
  async pendingApprovals(@Parent() proposal: Proposal): Promise<number> {
    return this.proposalService.getPendingApprovalsCount(proposal.id);
  }
}

@Resolver('ProposalSection')
@UseGuards(AuthGuard)
export class ProposalSectionResolver {
  constructor(private sectionService: ProposalSectionService) {}

  @ResolveField('wordCount')
  async wordCount(@Parent() section: ProposalSection): Promise<number> {
    const words = section.content.trim().split(/\s+/).filter((w) => w.length > 0);
    return words.length;
  }

  @ResolveField('isComplete')
  async isComplete(@Parent() section: ProposalSection): Promise<boolean> {
    return section.completedAt !== null;
  }
}
