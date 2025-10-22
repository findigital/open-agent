import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateProposalInput } from './dto/create-proposal.input';
import { UpdateProposalInput } from './dto/update-proposal.input';
import { Proposal, ProposalStatus, Prisma } from '@prisma/client';

@Injectable()
export class ProposalService {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService
  ) {}

  /**
   * Create a new proposal
   */
  async create(userId: string, input: CreateProposalInput): Promise<Proposal> {
    // Check workspace access
    const hasAccess = await this.workspaceService.checkAccess(input.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this workspace');
    }

    // If template is specified, verify it exists and belongs to workspace
    if (input.templateId) {
      const template = await this.prisma.proposalTemplate.findUnique({
        where: { id: input.templateId },
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      if (template.workspaceId !== input.workspaceId && !template.isPublic) {
        throw new BadRequestException('Template does not belong to this workspace');
      }
    }

    // Create proposal
    const proposal = await this.prisma.proposal.create({
      data: {
        workspaceId: input.workspaceId,
        templateId: input.templateId,
        title: input.title,
        clientName: input.clientName,
        grantId: input.grantId,
        status: 'draft',
        dueDate: input.dueDate,
        requestedAmount: input.requestedAmount,
        metadata: input.metadata || {},
        createdBy: userId,
      },
      include: {
        workspace: true,
        sections: true,
      },
    });

    // If template is provided, create sections from template
    if (input.templateId) {
      await this.createSectionsFromTemplate(proposal.id, input.templateId);
    }

    return proposal;
  }

  /**
   * Find proposal by ID
   */
  async findOne(id: string, userId: string): Promise<Proposal | null> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            organization: true,
          },
        },
        template: true,
        sections: {
          orderBy: { order: 'asc' },
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        approvals: {
          include: {
            approver: true,
          },
        },
        comments: {
          include: {
            user: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!proposal) {
      return null;
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return proposal;
  }

  /**
   * Find all proposals in a workspace
   */
  async findByWorkspace(
    workspaceId: string,
    userId: string,
    status?: ProposalStatus
  ): Promise<Proposal[]> {
    // Check access
    const hasAccess = await this.workspaceService.checkAccess(workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this workspace');
    }

    const where: Prisma.ProposalWhereInput = {
      workspaceId,
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.proposal.findMany({
      where,
      include: {
        workspace: true,
        template: true,
        sections: true,
        approvals: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find proposals created by user
   */
  async findByUser(userId: string, status?: ProposalStatus): Promise<Proposal[]> {
    const where: Prisma.ProposalWhereInput = {
      createdBy: userId,
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.proposal.findMany({
      where,
      include: {
        workspace: {
          include: {
            organization: true,
          },
        },
        template: true,
        sections: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update proposal
   */
  async update(id: string, userId: string, input: UpdateProposalInput): Promise<Proposal> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Don't allow editing submitted proposals
    if (proposal.status === 'submitted' || proposal.status === 'awarded') {
      throw new BadRequestException('Cannot edit submitted or awarded proposals');
    }

    return this.prisma.proposal.update({
      where: { id },
      data: {
        title: input.title,
        clientName: input.clientName,
        grantId: input.grantId,
        dueDate: input.dueDate,
        submittedAt: input.submittedAt,
        decisionDate: input.decisionDate,
        requestedAmount: input.requestedAmount,
        awardedAmount: input.awardedAmount,
        metadata: input.metadata,
      },
      include: {
        workspace: true,
        sections: true,
      },
    });
  }

  /**
   * Update proposal status
   */
  async updateStatus(id: string, userId: string, status: ProposalStatus): Promise<Proposal> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Status transition validation
    this.validateStatusTransition(proposal.status, status);

    const updateData: Prisma.ProposalUpdateInput = { status };

    // Set timestamps based on status
    if (status === 'submitted' && !proposal.submittedAt) {
      updateData.submittedAt = new Date();
    }

    return this.prisma.proposal.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete proposal
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Only allow deleting drafts
    if (proposal.status !== 'draft') {
      throw new BadRequestException('Can only delete draft proposals');
    }

    await this.prisma.proposal.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Get word count for proposal
   */
  async getWordCount(proposalId: string): Promise<number> {
    const sections = await this.prisma.proposalSection.findMany({
      where: { proposalId },
      select: { content: true },
    });

    return sections.reduce((total, section) => {
      const words = section.content.trim().split(/\s+/).filter((w) => w.length > 0);
      return total + words.length;
    }, 0);
  }

  /**
   * Get completion percentage
   */
  async getCompletionPercentage(proposalId: string): Promise<number> {
    const sections = await this.prisma.proposalSection.findMany({
      where: { proposalId },
      select: { completedAt: true },
    });

    if (sections.length === 0) {
      return 0;
    }

    const completedCount = sections.filter((s) => s.completedAt !== null).length;
    return Math.round((completedCount / sections.length) * 100);
  }

  /**
   * Get pending approvals count
   */
  async getPendingApprovalsCount(proposalId: string): Promise<number> {
    return this.prisma.proposalApproval.count({
      where: {
        proposalId,
        status: 'pending',
      },
    });
  }

  /**
   * Create sections from template
   */
  private async createSectionsFromTemplate(proposalId: string, templateId: string): Promise<void> {
    const templateSections = await this.prisma.templateSection.findMany({
      where: { templateId },
      orderBy: { order: 'asc' },
    });

    for (const templateSection of templateSections) {
      await this.prisma.proposalSection.create({
        data: {
          proposalId,
          parentId: null, // TODO: Handle hierarchical sections
          title: templateSection.title,
          type: templateSection.type,
          content: '',
          order: templateSection.order,
          wordLimit: templateSection.wordLimit,
          metadata: {
            description: templateSection.description,
            promptGuidance: templateSection.promptGuidance,
            required: templateSection.required,
          },
        },
      });
    }
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: ProposalStatus, newStatus: ProposalStatus): void {
    const validTransitions: Record<ProposalStatus, ProposalStatus[]> = {
      draft: ['draft', 'in_review'],
      in_review: ['in_review', 'draft', 'approved'],
      approved: ['approved', 'submitted', 'in_review'],
      submitted: ['submitted', 'awarded', 'rejected'],
      awarded: ['awarded'],
      rejected: ['rejected', 'draft'],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}
