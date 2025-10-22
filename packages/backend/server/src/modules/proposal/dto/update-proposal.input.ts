import { Field, InputType, Float } from '@nestjs/graphql';
import { IsString, IsOptional, IsNumber, MinLength, MaxLength } from 'class-validator';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class UpdateProposalInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  grantId?: string;

  @Field({ nullable: true })
  @IsOptional()
  dueDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  submittedAt?: Date;

  @Field({ nullable: true })
  @IsOptional()
  decisionDate?: Date;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  requestedAmount?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  awardedAmount?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  metadata?: any;
}
