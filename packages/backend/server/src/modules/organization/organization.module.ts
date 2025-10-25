import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationResolver } from './organization.resolver';
import { OrganizationMemberGuard } from './guards/organization-member.guard';
import { PrismaModule } from '../../base/prisma';

@Module({
  imports: [PrismaModule],
  providers: [OrganizationService, OrganizationResolver, OrganizationMemberGuard],
  exports: [OrganizationService, OrganizationMemberGuard],
})
export class OrganizationModule {}
