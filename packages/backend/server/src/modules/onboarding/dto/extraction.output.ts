import { ObjectType, Field, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class ExtractionResultOutput {
  @Field({ nullable: true })
  mission?: string;

  @Field({ nullable: true })
  vision?: string;

  @Field(() => [String], { nullable: true })
  values?: string[];

  @Field(() => [String], { nullable: true })
  focusAreas?: string[];

  @Field({ nullable: true })
  primaryNeed?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  needEvidence?: any;

  @Field({ nullable: true })
  uniqueApproach?: string;

  @Field({ nullable: true })
  gapsInSolutions?: string;

  @Field({ nullable: true })
  impactWithoutOrg?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  programs?: any;

  @Field(() => Float)
  confidence: number;
}
