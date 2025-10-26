import { Module } from '@nestjs/common';
import { PrismaModule } from '../../base/prisma/prisma.module';
import { GrantExcelService } from './grant-excel.service';
import { GrantExcelResolver } from './grant-excel.resolver';

@Module({
  imports: [PrismaModule],
  providers: [GrantExcelService, GrantExcelResolver],
  exports: [GrantExcelService],
})
export class GrantExcelModule {}
