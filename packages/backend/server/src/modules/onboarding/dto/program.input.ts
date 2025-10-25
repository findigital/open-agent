import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class ProgramNeedsEvidenceInput {
  @Field()
  @IsString()
  statistic: string;

  @Field()
  @IsString()
  source: string;
}

@InputType()
export class ProgramInput {
  @Field()
  @IsString()
  organizationId: string;

  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  description: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  needAddressed?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  howAddressesNeed?: string;

  @Field(() => [ProgramNeedsEvidenceInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramNeedsEvidenceInput)
  needEvidence?: ProgramNeedsEvidenceInput[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  targetPopulation?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  participantsServed?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  outcomes?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  budget?: number;
}
