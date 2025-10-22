import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { CreateOrganizationInput } from './dto/create-organization.input';
import { UpdateOrganizationInput } from './dto/update-organization.input';
import { Organization, OrganizationMember, Prisma } from '@prisma/client';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new organization
   * The creator is automatically added as OWNER
   */
  async create(
    userId: string,
    input: CreateOrganizationInput
  ): Promise<Organization> {
    // Check if slug is unique
    const existing = await this.prisma.organization.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new BadRequestException('Organization slug already exists');
    }

    // Create organization and add creator as owner in a transaction
    const organization = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
          taxId: input.taxId,
          type: input.type || 'nonprofit',
          mission: input.mission,
        },
      });

      // Add creator as owner
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: 'owner',
        },
      });

      return org;
    });

    return organization;
  }

  /**
   * Find organization by ID
   */
  async findOne(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: true,
        workspaces: true,
        documents: true,
      },
    });
  }

  /**
   * Find organization by slug
   */
  async findBySlug(slug: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { slug },
      include: {
        members: true,
        workspaces: true,
      },
    });
  }

  /**
   * Find all organizations
   */
  async findAll(): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      include: {
        members: true,
      },
    });
  }

  /**
   * Find organizations where user is a member
   */
  async findByUser(userId: string): Promise<Organization[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            members: true,
            workspaces: true,
          },
        },
      },
    });

    return memberships.map((m) => m.organization);
  }

  /**
   * Update organization
   * Only owners and admins can update
   */
  async update(
    id: string,
    userId: string,
    input: UpdateOrganizationInput
  ): Promise<Organization> {
    // Check permission
    await this.checkPermission(id, userId, ['owner', 'admin']);

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        name: input.name,
        taxId: input.taxId,
        type: input.type,
        mission: input.mission,
      },
    });

    return organization;
  }

  /**
   * Delete organization
   * Only owners can delete
   */
  async delete(id: string, userId: string): Promise<boolean> {
    // Check permission
    await this.checkPermission(id, userId, ['owner']);

    await this.prisma.organization.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: string,
    userId: string,
    targetUserId: string,
    role: string = 'member'
  ): Promise<OrganizationMember> {
    // Check permission (must be owner or admin to add members)
    await this.checkPermission(organizationId, userId, ['owner', 'admin']);

    // Check if user is already a member
    const existing = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this organization');
    }

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId,
        userId: targetUserId,
        role,
      },
    });

    return member;
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    membershipId: string,
    userId: string,
    newRole: string
  ): Promise<OrganizationMember> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Check permission (must be owner to change roles)
    await this.checkPermission(membership.organizationId, userId, ['owner']);

    // Don't allow changing the last owner's role
    if (membership.role === 'owner' && newRole !== 'owner') {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId: membership.organizationId,
          role: 'owner',
        },
      });

      if (ownerCount === 1) {
        throw new BadRequestException('Cannot remove the last owner');
      }
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: membershipId },
      data: { role: newRole },
    });

    return updated;
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    membershipId: string,
    userId: string
  ): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Check permission
    await this.checkPermission(membership.organizationId, userId, ['owner', 'admin']);

    // Don't allow removing the last owner
    if (membership.role === 'owner') {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId: membership.organizationId,
          role: 'owner',
        },
      });

      if (ownerCount === 1) {
        throw new BadRequestException('Cannot remove the last owner');
      }
    }

    await this.prisma.organizationMember.delete({
      where: { id: membershipId },
    });

    return true;
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(
    organizationId: string,
    userId: string
  ): Promise<string | null> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    return membership?.role || null;
  }

  /**
   * Check if user has required permission in organization
   */
  async checkPermission(
    organizationId: string,
    userId: string,
    allowedRoles: string[]
  ): Promise<void> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  /**
   * Check if user is a member of organization
   */
  async isMember(organizationId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    return !!membership;
  }
}
