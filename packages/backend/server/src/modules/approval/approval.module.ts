import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { ApprovalResolver } from './approval.resolver';
import { PrismaModule } from '../../base/prisma/prisma.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [PrismaModule, WorkspaceModule],
  providers: [ApprovalService, ApprovalResolver],
  exports: [ApprovalService],
})
export class ApprovalModule {}
