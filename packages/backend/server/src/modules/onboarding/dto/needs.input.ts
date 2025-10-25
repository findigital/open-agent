import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class NeedsEvidenceInput {
  @Field()
  @IsString()
  statistic: string;

  @Field()
  @IsString()
  source: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;
}

@InputType()
export class SaveNeedsInput {
  @Field()
  @IsString()
  organizationId: string;

  @Field()
  @IsString()
  primaryNeed: string;

  @Field(() => [NeedsEvidenceInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NeedsEvidenceInput)
  needEvidence?: NeedsEvidenceInput[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  impactWithoutOrg?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  gapsInSolutions?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  uniqueApproach?: string;
}
