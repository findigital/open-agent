import { InputType, Field } from '@nestjs/graphql';
import { IsUUID, IsNumber, IsDateString, IsOptional, IsEnum } from 'class-validator';

@InputType()
export class CreateAwardInput {
  @Field()
  @IsUUID()
  proposalId: string;

  @Field()
  @IsNumber()
  awardAmount: number;

  @Field()
  @IsDateString()
  awardDate: string;

  @Field()
  @IsDateString()
  projectStartDate: string;

  @Field()
  @IsDateString()
  projectEndDate: string;
}
