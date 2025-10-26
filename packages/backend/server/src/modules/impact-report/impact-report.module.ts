import { Module } from '@nestjs/common';
import { PrismaModule } from '../../base/prisma/prisma.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ImpactReportService } from './impact-report.service';
import { ImpactReportResolver } from './impact-report.resolver';

@Module({
  imports: [PrismaModule, WorkspaceModule],
  providers: [ImpactReportService, ImpactReportResolver],
  exports: [ImpactReportService],
})
export class ImpactReportModule {}
