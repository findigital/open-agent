import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum ComplianceStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  NEEDS_REVISION = 'NEEDS_REVISION',
  OVERDUE = 'OVERDUE',
}

@InputType()
export class UpdateRequirementInput {
  @Field({ nullable: true })
  @IsEnum(ComplianceStatusEnum)
  @IsOptional()
  status?: ComplianceStatusEnum;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  completedDate?: string;
}
