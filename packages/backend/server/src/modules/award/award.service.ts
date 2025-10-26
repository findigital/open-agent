import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateAwardInput } from './dto/create-award.input';
import { AddRequirementInput } from './dto/add-requirement.input';
import { UpdateRequirementInput } from './dto/update-requirement.input';
import { GrantAward, ComplianceRequirement } from '@prisma/client';

@Injectable()
export class AwardService {
  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService,
  ) {}

  /**
   * Create a new grant award record
   */
  async createAward(userId: string, input: CreateAwardInput): Promise<GrantAward> {
    // Get proposal and check access
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: input.proposalId },
      include: { workspace: true, award: true },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    if (proposal.award) {
      throw new BadRequestException('Award already exists for this proposal');
    }

    // Check if user has permission
    const hasAccess = await this.workspaceService.checkAccess(proposal.workspaceId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Create award and update proposal
    const award = await this.prisma.grantAward.create({
      data: {
        proposalId: input.proposalId,
        awardAmount: input.awardAmount,
        awardDate: new Date(input.awardDate),
        projectStartDate: new Date(input.projectStartDate),
        projectEndDate: new Date(input.projectEndDate),
        status: 'ACTIVE',
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
        requirements: true,
        reports: true,
      },
    });

    // Update proposal status and outcome
    await this.prisma.proposal.update({
      where: { id: input.proposalId },
      data: {
        status: 'awarded',
        outcome: 'AWARDED',
        outcomeDate: new Date(input.awardDate),
        awardedAmount: input.awardAmount,
      },
    });

    return award;
  }

  /**
   * Get award by proposal ID
   */
  async findByProposal(proposalId: string, userId: string): Promise<GrantAward | null> {
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

    return this.prisma.grantAward.findUnique({
      where: { proposalId },
      include: {
        proposal: true,
        requirements: {
          orderBy: { dueDate: 'asc' },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
        },
        communications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get award by ID
   */
  async findById(awardId: string, userId: string): Promise<GrantAward> {
    const award = await this.prisma.grantAward.findUnique({
      where: { id: awardId },
      include: {
        proposal: {
          include: {
            workspace: true,
          },
        },
        requirements: {
          orderBy: { dueDate: 'asc' },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
        },
        communications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!award) {
      throw new NotFoundException('Award not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(
      award.proposal.workspaceId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return award;
  }

  /**
   * Get all active awards for an organization
   */
  async findActiveByOrganization(organizationId: string, userId: string): Promise<GrantAward[]> {
    // Check user has access to organization
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.grantAward.findMany({
      where: {
        status: 'ACTIVE',
        proposal: {
          workspace: {
            organizationId,
          },
        },
      },
      include: {
        proposal: {
          include: {
            workspace: true,
          },
        },
        requirements: {
          where: {
            status: {
              in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'],
            },
          },
          orderBy: { dueDate: 'asc' },
        },
      },
      orderBy: { projectEndDate: 'asc' },
    });
  }

  /**
   * Add a compliance requirement to an award
   */
  async addRequirement(
    userId: string,
    input: AddRequirementInput,
  ): Promise<ComplianceRequirement> {
    const award = await this.prisma.grantAward.findUnique({
      where: { id: input.awardId },
      include: {
        proposal: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!award) {
      throw new NotFoundException('Award not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(
      award.proposal.workspaceId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.complianceRequirement.create({
      data: {
        awardId: input.awardId,
        type: input.type,
        title: input.title,
        description: input.description,
        dueDate: new Date(input.dueDate),
        status: 'PENDING',
      },
      include: {
        documents: true,
      },
    });
  }

  /**
   * Update compliance requirement status
   */
  async updateRequirement(
    requirementId: string,
    userId: string,
    input: UpdateRequirementInput,
  ): Promise<ComplianceRequirement> {
    const requirement = await this.prisma.complianceRequirement.findUnique({
      where: { id: requirementId },
      include: {
        award: {
          include: {
            proposal: {
              include: {
                workspace: true,
              },
            },
          },
        },
      },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(
      requirement.award.proposal.workspaceId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.complianceRequirement.update({
      where: { id: requirementId },
      data: {
        ...(input.status && { status: input.status }),
        ...(input.completedDate && { completedDate: new Date(input.completedDate) }),
      },
      include: {
        documents: true,
      },
    });
  }

  /**
   * Get upcoming compliance deadlines across all awards
   */
  async getUpcomingDeadlines(
    organizationId: string,
    userId: string,
    days: number = 30,
  ): Promise<ComplianceRequirement[]> {
    // Check user has access to organization
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Access denied');
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.complianceRequirement.findMany({
      where: {
        award: {
          proposal: {
            workspace: {
              organizationId,
            },
          },
        },
        dueDate: {
          gte: now,
          lte: futureDate,
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      include: {
        award: {
          include: {
            proposal: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get overdue requirements
   */
  async getOverdueRequirements(
    organizationId: string,
    userId: string,
  ): Promise<ComplianceRequirement[]> {
    // Check user has access to organization
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Access denied');
    }

    const now = new Date();

    return this.prisma.complianceRequirement.findMany({
      where: {
        award: {
          proposal: {
            workspace: {
              organizationId,
            },
          },
        },
        dueDate: {
          lt: now,
        },
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'],
        },
      },
      include: {
        award: {
          include: {
            proposal: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Link document to requirement
   */
  async linkDocumentToRequirement(
    requirementId: string,
    documentId: string,
    userId: string,
  ): Promise<boolean> {
    const requirement = await this.prisma.complianceRequirement.findUnique({
      where: { id: requirementId },
      include: {
        award: {
          include: {
            proposal: {
              include: {
                workspace: true,
              },
            },
          },
        },
      },
    });

    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    // Check access
    const hasAccess = await this.workspaceService.checkAccess(
      requirement.award.proposal.workspaceId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Check if document exists and belongs to same organization
    const document = await this.prisma.organizationDocument.findFirst({
      where: {
        id: documentId,
        organizationId: requirement.award.proposal.workspace.organizationId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found or does not belong to this organization');
    }

    // Check if link already exists
    const existing = await this.prisma.requirementDocument.findUnique({
      where: {
        requirementId_documentId: {
          requirementId,
          documentId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Document already linked to this requirement');
    }

    await this.prisma.requirementDocument.create({
      data: {
        requirementId,
        documentId,
      },
    });

    return true;
  }
}
