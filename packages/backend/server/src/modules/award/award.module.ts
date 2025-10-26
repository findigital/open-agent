import { Module } from '@nestjs/common';
import { AwardService } from './award.service';
import { AwardResolver } from './award.resolver';
import { WorkspaceModule } from '../workspace/workspace.module';
import { PrismaModule } from '../../base/prisma/prisma.module';

@Module({
  imports: [PrismaModule, WorkspaceModule],
  providers: [AwardService, AwardResolver],
  exports: [AwardService],
})
export class AwardModule {}
