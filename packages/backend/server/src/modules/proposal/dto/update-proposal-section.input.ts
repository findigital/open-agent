import { Field, InputType, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, MinLength, MaxLength } from 'class-validator';

@InputType()
export class UpdateProposalSectionInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  order?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  wordLimit?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @Field({ nullable: true })
  @IsOptional()
  completedAt?: Date;
}
