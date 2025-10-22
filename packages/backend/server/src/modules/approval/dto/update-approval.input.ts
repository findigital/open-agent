import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHANGES_REQUESTED = 'changes_requested',
}

@InputType()
export class UpdateProposalApprovalInput {
  @Field()
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  comment?: string;
}
