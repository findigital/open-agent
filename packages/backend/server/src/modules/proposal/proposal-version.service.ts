import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { ProposalVersion, Proposal } from '@prisma/client';

@Injectable()
export class ProposalVersionService {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService
  ) {}

  /**
   * Create a new version snapshot
   */
  async create(
    proposalId: string,
    userId: string,
    comment?: string
  ): Promise<ProposalVersion> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        workspace: true,
        sections: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Get current version number
    const latestVersion = await this.prisma.proposalVersion.findFirst({
      where: { proposalId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const versionNumber = (latestVersion?.versionNumber || 0) + 1;

    // Create snapshot of current state
    const content = {
      title: proposal.title,
      clientName: proposal.clientName,
      grantId: proposal.grantId,
      status: proposal.status,
      dueDate: proposal.dueDate,
      requestedAmount: proposal.requestedAmount?.toString(),
      metadata: proposal.metadata,
      sections: proposal.sections.map((section) => ({
        id: section.id,
        title: section.title,
        type: section.type,
        content: section.content,
        order: section.order,
        wordLimit: section.wordLimit,
        completedAt: section.completedAt,
      })),
    };

    return this.prisma.proposalVersion.create({
      data: {
        proposalId,
        versionNumber,
        content,
        createdBy: userId,
        comment,
      },
    });
  }

  /**
   * Get all versions for a proposal
   */
  async findByProposal(proposalId: string, userId: string): Promise<ProposalVersion[]> {
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

    return this.prisma.proposalVersion.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific version
   */
  async findOne(versionId: string, userId: string): Promise<ProposalVersion | null> {
    const version = await this.prisma.proposalVersion.findUnique({
      where: { id: versionId },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!version) {
      return null;
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(
      version.proposal.workspaceId,
      userId
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return version;
  }

  /**
   * Restore a proposal to a previous version
   */
  async restore(versionId: string, userId: string): Promise<Proposal> {
    const version = await this.prisma.proposalVersion.findUnique({
      where: { id: versionId },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(
      version.proposal.workspaceId,
      userId
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const content = version.content as any;

    // Restore proposal in a transaction
    const restoredProposal = await this.prisma.$transaction(async (tx) => {
      // Update proposal
      const proposal = await tx.proposal.update({
        where: { id: version.proposalId },
        data: {
          title: content.title,
          clientName: content.clientName,
          grantId: content.grantId,
          dueDate: content.dueDate ? new Date(content.dueDate) : null,
          requestedAmount: content.requestedAmount,
          metadata: content.metadata,
        },
      });

      // Delete current sections
      await tx.proposalSection.deleteMany({
        where: { proposalId: version.proposalId },
      });

      // Restore sections from version
      if (content.sections && Array.isArray(content.sections)) {
        for (const section of content.sections) {
          await tx.proposalSection.create({
            data: {
              proposalId: version.proposalId,
              title: section.title,
              type: section.type,
              content: section.content,
              order: section.order,
              wordLimit: section.wordLimit,
              completedAt: section.completedAt ? new Date(section.completedAt) : null,
              metadata: {},
            },
          });
        }
      }

      return proposal;
    });

    // Create a new version for the restore action
    await this.create(
      version.proposalId,
      userId,
      `Restored from version ${version.versionNumber}`
    );

    return restoredProposal;
  }

  /**
   * Compare two versions
   */
  async compare(
    versionId1: string,
    versionId2: string,
    userId: string
  ): Promise<{ version1: ProposalVersion; version2: ProposalVersion; diff: any }> {
    const [version1, version2] = await Promise.all([
      this.findOne(versionId1, userId),
      this.findOne(versionId2, userId),
    ]);

    if (!version1 || !version2) {
      throw new NotFoundException('One or both versions not found');
    }

    // Simple diff - in production you'd use a proper diff library
    const diff = {
      titleChanged: (version1.content as any).title !== (version2.content as any).title,
      sectionsAdded: 0,
      sectionsRemoved: 0,
      sectionsModified: 0,
    };

    return { version1, version2, diff };
  }
}
