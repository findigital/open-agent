import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateProposalSectionInput } from './dto/create-proposal-section.input';
import { UpdateProposalSectionInput } from './dto/update-proposal-section.input';
import { ProposalSection } from '@prisma/client';

@Injectable()
export class ProposalSectionService {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService
  ) {}

  /**
   * Create a new proposal section
   */
  async create(userId: string, input: CreateProposalSectionInput): Promise<ProposalSection> {
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

    // Verify parent section exists if provided
    if (input.parentId) {
      const parent = await this.prisma.proposalSection.findUnique({
        where: { id: input.parentId },
      });

      if (!parent || parent.proposalId !== input.proposalId) {
        throw new BadRequestException('Invalid parent section');
      }
    }

    return this.prisma.proposalSection.create({
      data: {
        proposalId: input.proposalId,
        parentId: input.parentId,
        title: input.title,
        type: input.type,
        content: input.content || '',
        order: input.order,
        wordLimit: input.wordLimit,
        assignedTo: input.assignedTo,
        metadata: {},
      },
    });
  }

  /**
   * Find section by ID
   */
  async findOne(id: string, userId: string): Promise<ProposalSection | null> {
    const section = await this.prisma.proposalSection.findUnique({
      where: { id },
      include: {
        proposal: {
          include: {
            workspace: true,
          },
        },
        parent: true,
        children: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!section) {
      return null;
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(
      section.proposal.workspaceId,
      userId
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return section;
  }

  /**
   * Update section
   */
  async update(
    id: string,
    userId: string,
    input: UpdateProposalSectionInput
  ): Promise<ProposalSection> {
    const section = await this.prisma.proposalSection.findUnique({
      where: { id },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(
      section.proposal.workspaceId,
      userId
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Auto-mark as completed if content meets requirements
    let completedAt = input.completedAt;
    if (input.content && !completedAt) {
      const wordCount = this.countWords(input.content);
      if (!section.wordLimit || wordCount >= section.wordLimit * 0.8) {
        completedAt = new Date();
      }
    }

    return this.prisma.proposalSection.update({
      where: { id },
      data: {
        title: input.title,
        content: input.content,
        order: input.order,
        wordLimit: input.wordLimit,
        assignedTo: input.assignedTo,
        completedAt,
      },
    });
  }

  /**
   * Delete section
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const section = await this.prisma.proposalSection.findUnique({
      where: { id },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(
      section.proposal.workspaceId,
      userId
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.proposalSection.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Reorder sections
   */
  async reorder(proposalId: string, userId: string, sectionIds: string[]): Promise<ProposalSection[]> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
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

    // Update order for each section
    const updates = sectionIds.map((sectionId, index) =>
      this.prisma.proposalSection.update({
        where: { id: sectionId },
        data: { order: index },
      })
    );

    await this.prisma.$transaction(updates);

    // Return updated sections
    return this.prisma.proposalSection.findMany({
      where: { proposalId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Get word count for section
   */
  getWordCount(sectionId: string): number {
    // This would typically be implemented as a resolver field
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Check if section is complete
   */
  async isComplete(sectionId: string): Promise<boolean> {
    const section = await this.prisma.proposalSection.findUnique({
      where: { id: sectionId },
      select: { completedAt: true },
    });

    return section?.completedAt !== null;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }
}
