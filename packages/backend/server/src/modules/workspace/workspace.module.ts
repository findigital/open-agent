import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceResolver } from './workspace.resolver';
import { PrismaModule } from '../../base/prisma/prisma.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [PrismaModule, OrganizationModule],
  providers: [WorkspaceService, WorkspaceResolver],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
