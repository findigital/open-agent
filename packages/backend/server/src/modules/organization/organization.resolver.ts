import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationInput } from './dto/create-organization.input';
import { UpdateOrganizationInput } from './dto/update-organization.input';
import { Organization, OrganizationMember } from '@prisma/client';
import { AuthGuard } from '../../core/auth/guard';

@Resolver('Organization')
@UseGuards(AuthGuard)
export class OrganizationResolver {
  constructor(private organizationService: OrganizationService) {}

  @Query('organization')
  async organization(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any
  ): Promise<Organization | null> {
    const organization = await this.organizationService.findOne(id);

    if (!organization) {
      return null;
    }

    // Check if user has access to this organization
    const userId = context.req.user.id;
    const isMember = await this.organizationService.isMember(id, userId);

    if (!isMember) {
      throw new ForbiddenException('Access denied');
    }

    return organization;
  }

  @Query('organizations')
  async organizations(): Promise<Organization[]> {
    return this.organizationService.findAll();
  }

  @Query('myOrganizations')
  async myOrganizations(@Context() context: any): Promise<Organization[]> {
    const userId = context.req.user.id;
    return this.organizationService.findByUser(userId);
  }

  @Mutation('createOrganization')
  async createOrganization(
    @Args('input') input: CreateOrganizationInput,
    @Context() context: any
  ): Promise<Organization> {
    const userId = context.req.user.id;
    return this.organizationService.create(userId, input);
  }

  @Mutation('updateOrganization')
  async updateOrganization(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateOrganizationInput,
    @Context() context: any
  ): Promise<Organization> {
    const userId = context.req.user.id;
    return this.organizationService.update(id, userId, input);
  }

  @Mutation('deleteOrganization')
  async deleteOrganization(
    @Args('id', { type: () => ID }) id: string,
    @Context() context: any
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.organizationService.delete(id, userId);
  }

  @Mutation('addOrganizationMember')
  async addOrganizationMember(
    @Args('organizationId', { type: () => ID }) organizationId: string,
    @Args('userId', { type: () => ID }) targetUserId: string,
    @Args('role') role: string,
    @Context() context: any
  ): Promise<OrganizationMember> {
    const userId = context.req.user.id;
    return this.organizationService.addMember(organizationId, userId, targetUserId, role);
  }

  @Mutation('updateOrganizationMemberRole')
  async updateOrganizationMemberRole(
    @Args('id', { type: () => ID }) membershipId: string,
    @Args('role') role: string,
    @Context() context: any
  ): Promise<OrganizationMember> {
    const userId = context.req.user.id;
    return this.organizationService.updateMemberRole(membershipId, userId, role);
  }

  @Mutation('removeOrganizationMember')
  async removeOrganizationMember(
    @Args('id', { type: () => ID }) membershipId: string,
    @Context() context: any
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.organizationService.removeMember(membershipId, userId);
  }
}
