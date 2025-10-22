import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProposalAiService } from './services/proposal-ai.service';
import { ProposalGenerationInput, ProposalGenerationResult, ComplianceCheckResult } from './types/agent.types';

// Placeholder guard
const AuthGuard = function () {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return descriptor;
  };
};

@Resolver('ProposalAI')
@UseGuards(AuthGuard)
export class AiResolver {
  constructor(private proposalAiService: ProposalAiService) {}

  // ============================================================================
  // Mutations
  // ============================================================================

  @Mutation('generateProposalSection')
  async generateProposalSection(
    @Args('input') input: ProposalGenerationInput,
    @Context() context: any
  ): Promise<ProposalGenerationResult> {
    const userId = context.req.user.id;
    return this.proposalAiService.generateSection(input, userId);
  }

  @Mutation('checkProposalCompliance')
  async checkProposalCompliance(
    @Args('proposalId') proposalId: string,
    @Args('grantId') grantId: string,
    @Context() context: any
  ): Promise<ComplianceCheckResult> {
    const userId = context.req.user.id;
    return this.proposalAiService.checkCompliance(proposalId, grantId, userId);
  }

  @Mutation('regenerateProposalSection')
  async regenerateProposalSection(
    @Args('sectionId') sectionId: string,
    @Args('proposalId') proposalId: string,
    @Args('userGuidance') userGuidance: string | undefined,
    @Context() context: any
  ): Promise<ProposalGenerationResult> {
    const userId = context.req.user.id;
    return this.proposalAiService.generateSection(
      {
        proposalId,
        sectionId,
        regenerate: true,
        userGuidance,
      },
      userId
    );
  }
}
