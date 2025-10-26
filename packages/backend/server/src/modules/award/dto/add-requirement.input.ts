import { InputType, Field } from '@nestjs/graphql';
import { IsUUID, IsString, IsDateString, IsEnum } from 'class-validator';

export enum RequirementTypeEnum {
  FINANCIAL_REPORT = 'FINANCIAL_REPORT',
  PROGRESS_REPORT = 'PROGRESS_REPORT',
  IMPACT_REPORT = 'IMPACT_REPORT',
  AUDIT = 'AUDIT',
  DOCUMENT_SUBMISSION = 'DOCUMENT_SUBMISSION',
  SITE_VISIT = 'SITE_VISIT',
  OTHER = 'OTHER',
}

@InputType()
export class AddRequirementInput {
  @Field()
  @IsUUID()
  awardId: string;

  @Field()
  @IsEnum(RequirementTypeEnum)
  type: RequirementTypeEnum;

  @Field()
  @IsString()
  title: string;

  @Field()
  @IsString()
  description: string;

  @Field()
  @IsDateString()
  dueDate: string;
}
