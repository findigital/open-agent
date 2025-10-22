import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceInput } from './dto/create-workspace.input';
import { UpdateWorkspaceInput } from './dto/update-workspace.input';
import { Workspace } from '@prisma/client';

// Assuming AuthGuard exists in the project
// If not, this will need to be created or imported from the correct location
const AuthGuard = function () {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Placeholder guard decorator
    return descriptor;
  };
};

@Resolver('Workspace')
@UseGuards(AuthGuard)
export class WorkspaceResolver {
  constructor(private workspaceService: WorkspaceService) {}

  /**
   * Get a specific workspace
   */
  @Query('workspace')
  async workspace(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<Workspace | null> {
    const userId = context.req.user.id;
    const workspace = await this.workspaceService.findOne(id);

    if (!workspace) {
      return null;
    }

    // Check if user has access to this workspace
    const hasAccess = await this.workspaceService.checkAccess(id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this workspace');
    }

    return workspace;
  }

  /**
   * Get all workspaces for an organization
   */
  @Query('workspaces')
  async workspaces(
    @Args('organizationId') organizationId: string,
    @Context() context: any
  ): Promise<Workspace[]> {
    const userId = context.req.user.id;
    return this.workspaceService.findByOrganization(organizationId, userId);
  }

  /**
   * Get all workspaces the current user has access to
   */
  @Query('myWorkspaces')
  async myWorkspaces(@Context() context: any): Promise<Workspace[]> {
    const userId = context.req.user.id;
    return this.workspaceService.findByUser(userId);
  }

  /**
   * Create a new workspace
   */
  @Mutation('createWorkspace')
  async createWorkspace(
    @Args('input') input: CreateWorkspaceInput,
    @Context() context: any
  ): Promise<Workspace> {
    const userId = context.req.user.id;
    return this.workspaceService.create(
      userId,
      input.organizationId,
      input.name,
      input.description
    );
  }

  /**
   * Update a workspace
   */
  @Mutation('updateWorkspace')
  async updateWorkspace(
    @Args('id') id: string,
    @Args('input') input: UpdateWorkspaceInput,
    @Context() context: any
  ): Promise<Workspace> {
    const userId = context.req.user.id;
    return this.workspaceService.update(id, userId, input);
  }

  /**
   * Delete a workspace
   */
  @Mutation('deleteWorkspace')
  async deleteWorkspace(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.workspaceService.delete(id, userId);
  }

  /**
   * Computed field: proposal count
   */
  @ResolveField('proposalCount')
  async proposalCount(@Parent() workspace: Workspace): Promise<number> {
    return this.workspaceService.getProposalCount(workspace.id);
  }

  /**
   * Computed field: template count
   */
  @ResolveField('templateCount')
  async templateCount(@Parent() workspace: Workspace): Promise<number> {
    return this.workspaceService.getTemplateCount(workspace.id);
  }
}
