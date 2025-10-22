import { Field, ObjectType, Float } from '@nestjs/graphql';

@ObjectType()
export class GrantOpportunityOutput {
  @Field()
  id: string;

  @Field({ nullable: true })
  externalId?: string;

  @Field()
  source: string;

  @Field()
  title: string;

  @Field()
  funderName: string;

  @Field()
  description: string;

  @Field()
  eligibility: string;

  @Field(() => [String])
  category: string[];

  @Field(() => [String])
  keywords: string[];

  @Field(() => Float, { nullable: true })
  minAmount?: number;

  @Field(() => Float, { nullable: true })
  maxAmount?: number;

  @Field({ nullable: true })
  openDate?: Date;

  @Field({ nullable: true })
  closeDate?: Date;

  @Field({ nullable: true })
  url?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
