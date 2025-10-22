import { Module } from '@nestjs/common';
import { GrantService } from './grant.service';
import { GrantResolver } from './grant.resolver';
import { PrismaModule } from '../../base/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GrantService, GrantResolver],
  exports: [GrantService],
})
export class GrantModule {}
