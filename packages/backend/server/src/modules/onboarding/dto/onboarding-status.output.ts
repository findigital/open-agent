import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class OnboardingProgressOutput {
  @Field()
  id: string;

  @Field()
  organizationId: string;

  @Field(() => Int)
  currentStep: number;

  @Field(() => GraphQLJSON)
  completedSteps: number[];

  @Field(() => Int)
  qualityScore: number;

  @Field()
  isComplete: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  completedAt?: Date;
}
