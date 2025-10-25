import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsArray } from 'class-validator';

@InputType()
export class MissionInput {
  @Field()
  @IsString()
  organizationId: string;

  @Field()
  @IsString()
  mission: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  vision?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  values?: string[];

  @Field(() => [String])
  @IsArray()
  focusAreas: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  geographicScope?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  targetPopulation?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  annualBudget?: string;
}
