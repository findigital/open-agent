import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CapacityInput {
  @Field()
  @IsString()
  organizationId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  staffCount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  fullTimeStaff?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  partTimeStaff?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  volunteers?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  boardCount?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  leadership?: Record<string, any>;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalRevenue?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalExpenses?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  programExpensePct?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adminExpensePct?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  fundingSources?: Record<string, any>;
}
