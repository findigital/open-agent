import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

@ObjectType()
export class OrganizationContextOutput {
  @Field()
  id: string;

  @Field()
  organizationId: string;

  // Identity
  @Field({ nullable: true })
  mission?: string;

  @Field({ nullable: true })
  vision?: string;

  @Field(() => [String], { nullable: true })
  values?: string[];

  @Field(() => [String], { nullable: true })
  focusAreas?: string[];

  @Field({ nullable: true })
  geographicScope?: string;

  @Field({ nullable: true })
  targetPopulation?: string;

  @Field({ nullable: true })
  yearFounded?: number;

  @Field({ nullable: true })
  annualBudget?: string;

  // Needs & Gaps
  @Field({ nullable: true })
  primaryNeed?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  needEvidence?: any;

  @Field({ nullable: true })
  impactWithoutOrg?: string;

  @Field({ nullable: true })
  gapsInSolutions?: string;

  @Field({ nullable: true })
  uniqueApproach?: string;

  // Programs
  @Field(() => GraphQLJSONObject)
  programs: any;

  // Capacity
  @Field({ nullable: true })
  staffCount?: number;

  @Field({ nullable: true })
  fullTimeStaff?: number;

  @Field({ nullable: true })
  partTimeStaff?: number;

  @Field({ nullable: true })
  volunteers?: number;

  @Field({ nullable: true })
  boardCount?: number;

  @Field(() => GraphQLJSONObject, { nullable: true })
  leadership?: any;

  // Financial
  @Field({ nullable: true })
  totalRevenue?: number;

  @Field({ nullable: true })
  totalExpenses?: number;

  @Field({ nullable: true })
  programExpensePct?: number;

  @Field({ nullable: true })
  adminExpensePct?: number;

  @Field(() => GraphQLJSONObject, { nullable: true })
  fundingSourcesJson?: any;

  // Impact
  @Field(() => GraphQLJSONObject)
  impactMetrics: any;

  @Field(() => GraphQLJSONObject)
  successStories: any;
}
