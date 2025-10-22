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
import { TemplateService } from './template.service';
import { CreateProposalTemplateInput } from './dto/create-template.input';
import { UpdateProposalTemplateInput } from './dto/update-template.input';
import { CreateTemplateSectionInput } from './dto/create-template-section.input';
import { ProposalTemplate, TemplateSection } from '@prisma/client';

// Placeholder guard
const AuthGuard = function () {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return descriptor;
  };
};

@Resolver('ProposalTemplate')
@UseGuards(AuthGuard)
export class TemplateResolver {
  constructor(private templateService: TemplateService) {}

  // ============================================================================
  // Queries
  // ============================================================================

  @Query('proposalTemplate')
  async proposalTemplate(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<ProposalTemplate | null> {
    const userId = context.req.user.id;
    return this.templateService.findOne(id, userId);
  }

  @Query('proposalTemplates')
  async proposalTemplates(
    @Args('workspaceId') workspaceId: string | undefined,
    @Args('category') category: string | undefined,
    @Args('publicOnly') publicOnly: boolean | undefined,
    @Context() context: any
  ): Promise<ProposalTemplate[]> {
    const userId = context.req.user.id;
    return this.templateService.findMany(userId, workspaceId, category, publicOnly);
  }

  // ============================================================================
  // Mutations
  // ============================================================================

  @Mutation('createProposalTemplate')
  async createProposalTemplate(
    @Args('input') input: CreateProposalTemplateInput,
    @Context() context: any
  ): Promise<ProposalTemplate> {
    const userId = context.req.user.id;
    return this.templateService.create(userId, input);
  }

  @Mutation('updateProposalTemplate')
  async updateProposalTemplate(
    @Args('id') id: string,
    @Args('input') input: UpdateProposalTemplateInput,
    @Context() context: any
  ): Promise<ProposalTemplate> {
    const userId = context.req.user.id;
    return this.templateService.update(id, userId, input);
  }

  @Mutation('deleteProposalTemplate')
  async deleteProposalTemplate(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.templateService.delete(id, userId);
  }

  @Mutation('cloneProposalTemplate')
  async cloneProposalTemplate(
    @Args('id') id: string,
    @Args('workspaceId') workspaceId: string,
    @Context() context: any
  ): Promise<ProposalTemplate> {
    const userId = context.req.user.id;
    return this.templateService.clone(id, workspaceId, userId);
  }

  // ============================================================================
  // Template Section Mutations
  // ============================================================================

  @Mutation('addTemplateSection')
  async addTemplateSection(
    @Args('input') input: CreateTemplateSectionInput,
    @Context() context: any
  ): Promise<TemplateSection> {
    const userId = context.req.user.id;
    return this.templateService.addSection(userId, input);
  }

  // ============================================================================
  // Computed Fields
  // ============================================================================

  @ResolveField('usageCount')
  async usageCount(@Parent() template: ProposalTemplate): Promise<number> {
    return this.templateService.getUsageCount(template.id);
  }
}
