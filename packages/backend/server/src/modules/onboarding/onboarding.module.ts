import { Module } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { OrganizationModule } from '../organization/organization.module';
import { AuthModule } from '../../core/auth';
import { ConfigModule } from '../../base/config';
import { OnboardingService } from './onboarding.service';
import { QualityScorerService } from './quality-scorer.service';
import { OnboardingAgentService } from './onboarding-agent.service';
import { OnboardingResolver } from './onboarding.resolver';

@Module({
  imports: [OrganizationModule, AuthModule, ConfigModule],
  providers: [PrismaService, OnboardingService, QualityScorerService, OnboardingAgentService, OnboardingResolver],
  exports: [OnboardingService, QualityScorerService, OnboardingAgentService],
})
export class OnboardingModule {}
