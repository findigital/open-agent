import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateProposalCommentInput } from './dto/create-comment.input';
import { ProposalComment } from '@prisma/client';

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService
  ) {}

  /**
   * Create a new comment
   */
  async create(userId: string, input: CreateProposalCommentInput): Promise<ProposalComment> {
    // Get proposal and check access
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: input.proposalId },
      include: { workspace: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Verify section exists if provided
    if (input.sectionId) {
      const section = await this.prisma.proposalSection.findUnique({
        where: { id: input.sectionId },
      });

      if (!section || section.proposalId !== input.proposalId) {
        throw new NotFoundException('Section not found or does not belong to this proposal');
      }
    }

    return this.prisma.proposalComment.create({
      data: {
        proposalId: input.proposalId,
        sectionId: input.sectionId,
        userId,
        content: input.content,
        resolved: false,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Get comments for a proposal
   */
  async findByProposal(proposalId: string, userId: string): Promise<ProposalComment[]> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { workspace: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.proposalComment.findMany({
      where: { proposalId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get comments for a specific section
   */
  async findBySection(sectionId: string, userId: string): Promise<ProposalComment[]> {
    const section = await this.prisma.proposalSection.findUnique({
      where: { id: sectionId },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const hasAccess = await this.workspaceService.checkAccess(
      section.proposal.workspaceId,
      userId
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.proposalComment.findMany({
      where: { sectionId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Resolve a comment
   */
  async resolve(commentId: string, userId: string): Promise<ProposalComment> {
    const comment = await this.prisma.proposalComment.findUnique({
      where: { id: commentId },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const hasAccess = await this.workspaceService.checkAccess(
      comment.proposal.workspaceId,
      userId
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.proposalComment.update({
      where: { id: commentId },
      data: { resolved: true },
      include: {
        user: true,
      },
    });
  }

  /**
   * Delete a comment
   */
  async delete(commentId: string, userId: string): Promise<boolean> {
    const comment = await this.prisma.proposalComment.findUnique({
      where: { id: commentId },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only the comment author or workspace admin can delete
    if (comment.userId !== userId) {
      const hasAccess = await this.workspaceService.checkAccess(
        comment.proposal.workspaceId,
        userId
      );

      if (!hasAccess) {
        throw new ForbiddenException('Only the comment author can delete this comment');
      }
    }

    await this.prisma.proposalComment.delete({
      where: { id: commentId },
    });

    return true;
  }

  /**
   * Get unresolved comment count for a proposal
   */
  async getUnresolvedCount(proposalId: string): Promise<number> {
    return this.prisma.proposalComment.count({
      where: {
        proposalId,
        resolved: false,
      },
    });
  }

  /**
   * Get activity feed for a user
   */
  async getActivityFeed(userId: string, limit: number = 20): Promise<ProposalComment[]> {
    // Get all workspaces user has access to
    const workspaces = await this.workspaceService.findByUser(userId);
    const workspaceIds = workspaces.map((w) => w.id);

    return this.prisma.proposalComment.findMany({
      where: {
        proposal: {
          workspaceId: {
            in: workspaceIds,
          },
        },
      },
      include: {
        user: true,
        proposal: {
          select: {
            id: true,
            title: true,
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
