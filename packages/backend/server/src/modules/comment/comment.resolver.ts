import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateProposalCommentInput } from './dto/create-comment.input';
import { ProposalComment } from '@prisma/client';

// Placeholder guard
const AuthGuard = function () {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return descriptor;
  };
};

@Resolver('ProposalComment')
@UseGuards(AuthGuard)
export class CommentResolver {
  constructor(private commentService: CommentService) {}

  // ============================================================================
  // Queries
  // ============================================================================

  @Query('proposalComments')
  async proposalComments(
    @Args('proposalId') proposalId: string,
    @Context() context: any
  ): Promise<ProposalComment[]> {
    const userId = context.req.user.id;
    return this.commentService.findByProposal(proposalId, userId);
  }

  @Query('sectionComments')
  async sectionComments(
    @Args('sectionId') sectionId: string,
    @Context() context: any
  ): Promise<ProposalComment[]> {
    const userId = context.req.user.id;
    return this.commentService.findBySection(sectionId, userId);
  }

  @Query('myActivityFeed')
  async myActivityFeed(
    @Args('limit') limit: number | undefined,
    @Context() context: any
  ): Promise<ProposalComment[]> {
    const userId = context.req.user.id;
    return this.commentService.getActivityFeed(userId, limit || 20);
  }

  // ============================================================================
  // Mutations
  // ============================================================================

  @Mutation('createProposalComment')
  async createProposalComment(
    @Args('input') input: CreateProposalCommentInput,
    @Context() context: any
  ): Promise<ProposalComment> {
    const userId = context.req.user.id;
    return this.commentService.create(userId, input);
  }

  @Mutation('resolveProposalComment')
  async resolveProposalComment(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<ProposalComment> {
    const userId = context.req.user.id;
    return this.commentService.resolve(id, userId);
  }

  @Mutation('deleteProposalComment')
  async deleteProposalComment(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.commentService.delete(id, userId);
  }
}
