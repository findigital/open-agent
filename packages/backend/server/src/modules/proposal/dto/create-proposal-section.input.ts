import { Field, InputType, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, MinLength, MaxLength } from 'class-validator';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateProposalSectionInput {
  @Field()
  @IsString()
  proposalId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @Field()
  @IsString()
  type: string;

  @Field({ nullable: true, defaultValue: '' })
  @IsOptional()
  @IsString()
  content?: string;

  @Field(() => Int)
  @IsInt()
  order: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  wordLimit?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
