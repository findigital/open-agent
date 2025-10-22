import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GrantService } from './grant.service';
import { SearchGrantsInput } from './dto/search-grants.input';
import { GrantOpportunity } from '@prisma/client';

// Placeholder guard
const AuthGuard = function () {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return descriptor;
  };
};

@Resolver('GrantOpportunity')
@UseGuards(AuthGuard)
export class GrantResolver {
  constructor(private grantService: GrantService) {}

  // ============================================================================
  // Queries
  // ============================================================================

  @Query('grantOpportunity')
  async grantOpportunity(@Args('id') id: string): Promise<GrantOpportunity | null> {
    return this.grantService.findOne(id);
  }

  @Query('searchGrants')
  async searchGrants(@Args('input') input: SearchGrantsInput): Promise<GrantOpportunity[]> {
    return this.grantService.search(input);
  }

  @Query('recommendedGrants')
  async recommendedGrants(
    @Args('organizationId') organizationId: string,
    @Args('limit') limit: number | undefined,
    @Context() context: any
  ): Promise<GrantOpportunity[]> {
    // TODO: Add authorization check for organization access
    return this.grantService.getRecommendations(organizationId, limit || 10);
  }

  @Query('grantStats')
  async grantStats(): Promise<any> {
    return this.grantService.getStats();
  }

  // ============================================================================
  // Mutations
  // ============================================================================

  @Mutation('syncGrants')
  async syncGrants(@Context() context: any): Promise<any> {
    // TODO: Add admin-only authorization
    const userId = context.req.user.id;
    return this.grantService.syncAllSources();
  }

  @Mutation('importGrant')
  async importGrant(
    @Args('data') data: any,
    @Context() context: any
  ): Promise<GrantOpportunity> {
    // TODO: Add admin-only authorization
    return this.grantService.importGrant(data);
  }
}
