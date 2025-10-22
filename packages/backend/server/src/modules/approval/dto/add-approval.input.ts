import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class AddProposalApprovalInput {
  @Field()
  @IsString()
  proposalId: string;

  @Field()
  @IsString()
  approverUserId: string;
}
