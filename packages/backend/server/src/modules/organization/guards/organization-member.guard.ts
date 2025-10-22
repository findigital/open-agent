import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { OrganizationService } from '../organization.service';

/**
 * Guard to check if user is a member of an organization
 * Usage: @UseGuards(OrganizationMemberGuard)
 *
 * Optional: @SetMetadata('organizationRoles', ['owner', 'admin'])
 * to require specific roles
 */
@Injectable()
export class OrganizationMemberGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private organizationService: OrganizationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();
    const args = gqlContext.getArgs();

    if (!req.user?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const userId = req.user.id;

    // Try to extract organizationId from various possible argument names
    const organizationId =
      args.organizationId ||
      args.input?.organizationId ||
      args.id; // For organization-level queries

    if (!organizationId) {
      // If no organizationId in args, might be accessing own organizations
      return true;
    }

    // Check if user is a member
    const isMember = await this.organizationService.isMember(organizationId, userId);

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Check for required roles if specified
    const requiredRoles = this.reflector.get<string[]>('organizationRoles', context.getHandler());

    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = await this.organizationService.getUserRole(organizationId, userId);

      if (!userRole || !requiredRoles.includes(userRole)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
