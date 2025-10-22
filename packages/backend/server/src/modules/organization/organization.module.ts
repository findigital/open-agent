import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationResolver } from './organization.resolver';
import { PrismaModule } from '../../base/prisma';

@Module({
  imports: [PrismaModule],
  providers: [OrganizationService, OrganizationResolver],
  exports: [OrganizationService],
})
export class OrganizationModule {}
