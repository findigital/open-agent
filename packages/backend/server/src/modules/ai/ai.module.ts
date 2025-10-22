import { Module } from '@nestjs/common';
import { PrismaModule } from '../../base/prisma/prisma.module';
import { DocumentModule } from '../document/document.module';
import { GrantModule } from '../grant/grant.module';
import { BaseAgentService } from './services/base-agent.service';
import { ProposalAiService } from './services/proposal-ai.service';
import { EmbeddingService } from './services/embedding.service';
import { AiResolver } from './ai.resolver';

@Module({
  imports: [PrismaModule, DocumentModule, GrantModule],
  providers: [BaseAgentService, ProposalAiService, EmbeddingService, AiResolver],
  exports: [BaseAgentService, ProposalAiService, EmbeddingService],
})
export class AiModule {}
