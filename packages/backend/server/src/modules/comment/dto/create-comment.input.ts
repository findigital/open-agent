import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';

@InputType()
export class CreateProposalCommentInput {
  @Field()
  @IsString()
  proposalId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @Field()
  @IsString()
  content: string;
}
