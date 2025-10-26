import { Module } from '@nestjs/common';
import { PrismaModule } from '../../base/prisma/prisma.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AiModule } from '../ai/ai.module';
import { ImpactReportService } from './impact-report.service';
import { ImpactReportResolver } from './impact-report.resolver';
import { ImpactReportAiService } from './impact-report-ai.service';

@Module({
  imports: [PrismaModule, WorkspaceModule, AiModule],
  providers: [ImpactReportService, ImpactReportResolver, ImpactReportAiService],
  exports: [ImpactReportService],
})
export class ImpactReportModule {}
