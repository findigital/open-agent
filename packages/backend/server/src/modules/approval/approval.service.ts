import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { AddProposalApprovalInput } from './dto/add-approval.input';
import { UpdateProposalApprovalInput } from './dto/update-approval.input';
import { ProposalApproval } from '@prisma/client';

@Injectable()
export class ApprovalService {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService
  ) {}

  /**
   * Add an approver to a proposal
   */
  async add(userId: string, input: AddProposalApprovalInput): Promise<ProposalApproval> {
    // Get proposal and check access
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: input.proposalId },
      include: { workspace: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // Check if user has permission to add approvers
    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Check if approver already exists
    const existing = await this.prisma.proposalApproval.findFirst({
      where: {
        proposalId: input.proposalId,
        approverUserId: input.approverUserId,
      },
    });

    if (existing) {
      throw new BadRequestException('Approver already added to this proposal');
    }

    // Verify approver has access to workspace
    const approverHasAccess = await this.workspaceService.checkAccess(
      proposal.workspaceId,
      input.approverUserId
    );

    if (!approverHasAccess) {
      throw new BadRequestException('Approver does not have access to this workspace');
    }

    return this.prisma.proposalApproval.create({
      data: {
        proposalId: input.proposalId,
        approverUserId: input.approverUserId,
        status: 'pending',
      },
      include: {
        approver: true,
        proposal: true,
      },
    });
  }

  /**
   * Update approval status
   */
  async update(
    approvalId: string,
    userId: string,
    input: UpdateProposalApprovalInput
  ): Promise<ProposalApproval> {
    const approval = await this.prisma.proposalApproval.findUnique({
      where: { id: approvalId },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    // Only the assigned approver can update their approval
    if (approval.approverUserId !== userId) {
      throw new ForbiddenException('Only the assigned approver can update this approval');
    }

    // Can't update if already responded
    if (approval.status !== 'pending') {
      throw new BadRequestException('Approval has already been responded to');
    }

    const updated = await this.prisma.proposalApproval.update({
      where: { id: approvalId },
      data: {
        status: input.status,
        comment: input.comment,
        respondedAt: new Date(),
      },
      include: {
        approver: true,
        proposal: true,
      },
    });

    // Auto-update proposal status based on approvals
    await this.updateProposalStatus(approval.proposalId);

    return updated;
  }

  /**
   * Remove an approver
   */
  async remove(approvalId: string, userId: string): Promise<boolean> {
    const approval = await this.prisma.proposalApproval.findUnique({
      where: { id: approvalId },
      include: {
        proposal: {
          include: { workspace: true },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    // Check if user has permission
    const hasAccess = await this.workspaceService.checkAccess(
      approval.proposal.workspaceId,
      userId
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Can't remove if already approved/rejected
    if (approval.status !== 'pending') {
      throw new BadRequestException('Cannot remove approval that has been responded to');
    }

    await this.prisma.proposalApproval.delete({
      where: { id: approvalId },
    });

    return true;
  }

  /**
   * Get approvals for a proposal
   */
  async findByProposal(proposalId: string, userId: string): Promise<ProposalApproval[]> {
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

    return this.prisma.proposalApproval.findMany({
      where: { proposalId },
      include: {
        approver: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get pending approvals for a user
   */
  async findPendingForUser(userId: string): Promise<ProposalApproval[]> {
    return this.prisma.proposalApproval.findMany({
      where: {
        approverUserId: userId,
        status: 'pending',
      },
      include: {
        proposal: {
          include: {
            workspace: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if all approvals are complete and update proposal status
   */
  private async updateProposalStatus(proposalId: string): Promise<void> {
    const approvals = await this.prisma.proposalApproval.findMany({
      where: { proposalId },
    });

    if (approvals.length === 0) {
      return;
    }

    const allResponded = approvals.every((a) => a.status !== 'pending');
    const allApproved = approvals.every((a) => a.status === 'approved');
    const anyRejected = approvals.some((a) => a.status === 'rejected');
    const anyChangesRequested = approvals.some((a) => a.status === 'changes_requested');

    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return;
    }

    // Update proposal status based on approval results
    if (proposal.status === 'in_review') {
      if (allResponded) {
        if (allApproved) {
          await this.prisma.proposal.update({
            where: { id: proposalId },
            data: { status: 'approved' },
          });
        } else if (anyRejected) {
          await this.prisma.proposal.update({
            where: { id: proposalId },
            data: { status: 'draft' }, // Send back to draft
          });
        } else if (anyChangesRequested) {
          await this.prisma.proposal.update({
            where: { id: proposalId },
            data: { status: 'draft' }, // Send back to draft for changes
          });
        }
      }
    }
  }

  /**
   * Get approval statistics for a proposal
   */
  async getStats(proposalId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    changesRequested: number;
  }> {
    const approvals = await this.prisma.proposalApproval.findMany({
      where: { proposalId },
      select: { status: true },
    });

    return {
      total: approvals.length,
      pending: approvals.filter((a) => a.status === 'pending').length,
      approved: approvals.filter((a) => a.status === 'approved').length,
      rejected: approvals.filter((a) => a.status === 'rejected').length,
      changesRequested: approvals.filter((a) => a.status === 'changes_requested').length,
    };
  }
}
