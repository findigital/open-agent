import { Module } from '@nestjs/common';
import { PrismaModule } from '../../base/prisma/prisma.module';
import { NotificationService } from './notification.service';
import { NotificationScheduler } from './notification.scheduler';

@Module({
  imports: [PrismaModule],
  providers: [NotificationService, NotificationScheduler],
  exports: [NotificationService],
})
export class NotificationModule {}
