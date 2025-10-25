import { Module } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { OrganizationModule } from '../organization/organization.module';
import { OnboardingService } from './onboarding.service';
import { QualityScorerService } from './quality-scorer.service';
import { OnboardingResolver } from './onboarding.resolver';

@Module({
  imports: [OrganizationModule],
  providers: [PrismaService, OnboardingService, QualityScorerService, OnboardingResolver],
  exports: [OnboardingService, QualityScorerService],
})
export class OnboardingModule {}
