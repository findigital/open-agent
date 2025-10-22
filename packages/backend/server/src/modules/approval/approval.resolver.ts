import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { AddProposalApprovalInput } from './dto/add-approval.input';
import { UpdateProposalApprovalInput } from './dto/update-approval.input';
import { ProposalApproval } from '@prisma/client';

// Placeholder guard
const AuthGuard = function () {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return descriptor;
  };
};

@Resolver('ProposalApproval')
@UseGuards(AuthGuard)
export class ApprovalResolver {
  constructor(private approvalService: ApprovalService) {}

  // ============================================================================
  // Queries
  // ============================================================================

  @Query('proposalApprovals')
  async proposalApprovals(
    @Args('proposalId') proposalId: string,
    @Context() context: any
  ): Promise<ProposalApproval[]> {
    const userId = context.req.user.id;
    return this.approvalService.findByProposal(proposalId, userId);
  }

  @Query('myPendingApprovals')
  async myPendingApprovals(@Context() context: any): Promise<ProposalApproval[]> {
    const userId = context.req.user.id;
    return this.approvalService.findPendingForUser(userId);
  }

  @Query('proposalApprovalStats')
  async proposalApprovalStats(@Args('proposalId') proposalId: string): Promise<any> {
    return this.approvalService.getStats(proposalId);
  }

  // ============================================================================
  // Mutations
  // ============================================================================

  @Mutation('addProposalApproval')
  async addProposalApproval(
    @Args('input') input: AddProposalApprovalInput,
    @Context() context: any
  ): Promise<ProposalApproval> {
    const userId = context.req.user.id;
    return this.approvalService.add(userId, input);
  }

  @Mutation('updateProposalApproval')
  async updateProposalApproval(
    @Args('id') id: string,
    @Args('input') input: UpdateProposalApprovalInput,
    @Context() context: any
  ): Promise<ProposalApproval> {
    const userId = context.req.user.id;
    return this.approvalService.update(id, userId, input);
  }

  @Mutation('removeProposalApproval')
  async removeProposalApproval(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.approvalService.remove(id, userId);
  }
}
