import { Module } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { ProposalSectionService } from './proposal-section.service';
import { ProposalVersionService } from './proposal-version.service';
import { ProposalResolver, ProposalSectionResolver } from './proposal.resolver';
import { PrismaModule } from '../../base/prisma/prisma.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [PrismaModule, WorkspaceModule],
  providers: [
    ProposalService,
    ProposalSectionService,
    ProposalVersionService,
    ProposalResolver,
    ProposalSectionResolver,
  ],
  exports: [ProposalService, ProposalSectionService, ProposalVersionService],
})
export class ProposalModule {}
