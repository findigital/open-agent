import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { OrganizationService } from '../organization/organization.service';
import { UpdateWorkspaceInput } from './dto/update-workspace.input';
import { Workspace } from '@prisma/client';

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private organizationService: OrganizationService
  ) {}

  async create(userId: string, organizationId: string, name: string, description?: string): Promise<Workspace> {
    // Check if user has permission in organization
    await this.organizationService.checkPermission(organizationId, userId, ['owner', 'admin', 'member']);

    const workspace = await this.prisma.workspace.create({
      data: {
        organizationId,
        name,
        description,
      },
    });

    return workspace;
  }

  async findOne(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
      include: {
        organization: true,
        proposals: true,
        templates: true,
      },
    });
  }

  async findByOrganization(organizationId: string, userId: string): Promise<Workspace[]> {
    // Check if user has access to organization
    await this.organizationService.checkPermission(organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    return this.prisma.workspace.findMany({
      where: { organizationId },
      include: {
        proposals: true,
        templates: true,
      },
    });
  }

  async findByUser(userId: string): Promise<Workspace[]> {
    const organizations = await this.organizationService.findByUser(userId);
    const organizationIds = organizations.map((org) => org.id);

    return this.prisma.workspace.findMany({
      where: {
        organizationId: {
          in: organizationIds,
        },
      },
      include: {
        organization: true,
        proposals: true,
      },
    });
  }

  async update(id: string, userId: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    const workspace = await this.findOne(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.organizationService.checkPermission(workspace.organizationId, userId, ['owner', 'admin']);

    return this.prisma.workspace.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
      },
    });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const workspace = await this.findOne(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.organizationService.checkPermission(workspace.organizationId, userId, ['owner', 'admin']);

    await this.prisma.workspace.delete({
      where: { id },
    });

    return true;
  }

  async checkAccess(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = await this.findOne(workspaceId);
    if (!workspace) {
      return false;
    }

    return this.organizationService.isMember(workspace.organizationId, userId);
  }

  /**
   * Get count of proposals in workspace
   */
  async getProposalCount(workspaceId: string): Promise<number> {
    return this.prisma.proposal.count({
      where: { workspaceId },
    });
  }

  /**
   * Get count of templates in workspace
   */
  async getTemplateCount(workspaceId: string): Promise<number> {
    return this.prisma.proposalTemplate.count({
      where: { workspaceId },
    });
  }
}
