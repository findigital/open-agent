import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class QualityScoreOutput {
  @Field(() => Int)
  identity: number;

  @Field(() => Int)
  needs: number;

  @Field(() => Int)
  programs: number;

  @Field(() => Int)
  capacity: number;

  @Field(() => Int)
  impact: number;

  @Field(() => Int)
  overall: number;
}

@ObjectType()
export class RecommendationOutput {
  @Field()
  priority: string;

  @Field()
  action: string;

  @Field()
  benefit: string;

  @Field(() => Int)
  pointsGain: number;

  @Field()
  estimatedTime: string;

  @Field()
  category: string;
}
