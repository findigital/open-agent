import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateProposalTemplateInput } from './dto/create-template.input';
import { UpdateProposalTemplateInput } from './dto/update-template.input';
import { CreateTemplateSectionInput } from './dto/create-template-section.input';
import { ProposalTemplate, TemplateSection, Prisma } from '@prisma/client';

@Injectable()
export class TemplateService {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService
  ) {}

  /**
   * Create a new proposal template
   */
  async create(userId: string, input: CreateProposalTemplateInput): Promise<ProposalTemplate> {
    // Check workspace access
    const hasAccess = await this.workspaceService.checkAccess(input.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this workspace');
    }

    return this.prisma.proposalTemplate.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description,
        category: input.category,
        isPublic: input.isPublic || false,
      },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Find template by ID
   */
  async findOne(id: string, userId: string): Promise<ProposalTemplate | null> {
    const template = await this.prisma.proposalTemplate.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            organization: true,
          },
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!template) {
      return null;
    }

    // Check access - public templates or user has workspace access
    if (!template.isPublic) {
      const hasAccess = await this.workspaceService.checkAccess(template.workspaceId, userId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    return template;
  }

  /**
   * Find templates by workspace or public templates
   */
  async findMany(
    userId: string,
    workspaceId?: string,
    category?: string,
    publicOnly?: boolean
  ): Promise<ProposalTemplate[]> {
    const where: Prisma.ProposalTemplateWhereInput = {};

    if (publicOnly) {
      where.isPublic = true;
    } else if (workspaceId) {
      // Check workspace access
      const hasAccess = await this.workspaceService.checkAccess(workspaceId, userId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this workspace');
      }
      where.OR = [
        { workspaceId },
        { isPublic: true },
      ];
    } else {
      // Show public templates only if no workspace specified
      where.isPublic = true;
    }

    if (category) {
      where.category = category;
    }

    return this.prisma.proposalTemplate.findMany({
      where,
      include: {
        workspace: true,
        sections: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update template
   */
  async update(
    id: string,
    userId: string,
    input: UpdateProposalTemplateInput
  ): Promise<ProposalTemplate> {
    const template = await this.prisma.proposalTemplate.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(template.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.proposalTemplate.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        isPublic: input.isPublic,
      },
    });
  }

  /**
   * Delete template
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const template = await this.prisma.proposalTemplate.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(template.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Check if template is in use
    const usageCount = await this.prisma.proposal.count({
      where: { templateId: id },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete template that is used by ${usageCount} proposal(s)`
      );
    }

    await this.prisma.proposalTemplate.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Clone template to another workspace
   */
  async clone(
    id: string,
    targetWorkspaceId: string,
    userId: string
  ): Promise<ProposalTemplate> {
    const sourceTemplate = await this.findOne(id, userId);

    if (!sourceTemplate) {
      throw new NotFoundException('Template not found');
    }

    // Check access to target workspace
    const hasAccess = await this.workspaceService.checkAccess(targetWorkspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to target workspace');
    }

    // Clone template and sections in a transaction
    const clonedTemplate = await this.prisma.$transaction(async (tx) => {
      const template = await tx.proposalTemplate.create({
        data: {
          workspaceId: targetWorkspaceId,
          name: `${sourceTemplate.name} (Copy)`,
          description: sourceTemplate.description,
          category: sourceTemplate.category,
          isPublic: false,
        },
      });

      // Clone sections
      const sections = await tx.templateSection.findMany({
        where: { templateId: id },
        orderBy: { order: 'asc' },
      });

      for (const section of sections) {
        await tx.templateSection.create({
          data: {
            templateId: template.id,
            parentId: null, // TODO: Handle hierarchical structure
            title: section.title,
            description: section.description,
            type: section.type,
            order: section.order,
            wordLimit: section.wordLimit,
            required: section.required,
            promptGuidance: section.promptGuidance,
          },
        });
      }

      return template;
    });

    return clonedTemplate;
  }

  /**
   * Add section to template
   */
  async addSection(userId: string, input: CreateTemplateSectionInput): Promise<TemplateSection> {
    const template = await this.prisma.proposalTemplate.findUnique({
      where: { id: input.templateId },
      include: { workspace: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(template.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.templateSection.create({
      data: {
        templateId: input.templateId,
        parentId: input.parentId,
        title: input.title,
        description: input.description,
        type: input.type,
        order: input.order,
        wordLimit: input.wordLimit,
        required: input.required,
        promptGuidance: input.promptGuidance,
      },
    });
  }

  /**
   * Get usage count for template
   */
  async getUsageCount(templateId: string): Promise<number> {
    return this.prisma.proposal.count({
      where: { templateId },
    });
  }

  /**
   * Get predefined starter templates
   */
  async getStarterTemplates(): Promise<any[]> {
    return [
      {
        name: 'Federal Grant Proposal',
        description: 'Standard template for federal government grants',
        category: 'government',
        sections: [
          { title: 'Executive Summary', type: 'text', order: 1, wordLimit: 500, required: true },
          { title: 'Project Description', type: 'text', order: 2, wordLimit: 2000, required: true },
          { title: 'Budget Narrative', type: 'budget', order: 3, required: true },
          { title: 'Organizational Capacity', type: 'text', order: 4, wordLimit: 1000, required: true },
          { title: 'Evaluation Plan', type: 'text', order: 5, wordLimit: 1000, required: true },
        ],
      },
      {
        name: 'Foundation Grant Proposal',
        description: 'Template for private foundation grants',
        category: 'foundation',
        sections: [
          { title: 'Cover Letter', type: 'text', order: 1, wordLimit: 300, required: true },
          { title: 'Problem Statement', type: 'text', order: 2, wordLimit: 500, required: true },
          { title: 'Goals and Objectives', type: 'text', order: 3, wordLimit: 500, required: true },
          { title: 'Methods and Strategies', type: 'text', order: 4, wordLimit: 1000, required: true },
          { title: 'Budget', type: 'budget', order: 5, required: true },
          { title: 'Sustainability', type: 'text', order: 6, wordLimit: 500, required: false },
        ],
      },
      {
        name: 'Corporate Sponsorship Proposal',
        description: 'Template for corporate partnership proposals',
        category: 'corporate',
        sections: [
          { title: 'Partnership Overview', type: 'text', order: 1, wordLimit: 400, required: true },
          { title: 'Sponsorship Levels', type: 'table', order: 2, required: true },
          { title: 'Benefits to Sponsor', type: 'text', order: 3, wordLimit: 600, required: true },
          { title: 'Event Details', type: 'text', order: 4, wordLimit: 800, required: true },
        ],
      },
    ];
  }
}
