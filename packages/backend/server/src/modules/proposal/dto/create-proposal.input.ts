import { Field, InputType, Float } from '@nestjs/graphql';
import { IsString, IsOptional, IsNumber, IsEnum, MinLength, MaxLength } from 'class-validator';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateProposalInput {
  @Field()
  @IsString()
  workspaceId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  templateId?: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

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

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  requestedAmount?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  metadata?: any;
}
