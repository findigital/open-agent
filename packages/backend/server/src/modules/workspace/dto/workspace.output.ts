import { Field, ObjectType, Int } from '@nestjs/graphql';

@ObjectType()
export class WorkspaceOutput {
  @Field()
  id: string;

  @Field()
  organizationId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => Int)
  proposalCount: number;

  @Field(() => Int)
  templateCount: number;
}
