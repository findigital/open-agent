import { Field, InputType } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class UploadOrganizationDocumentInput {
  @Field()
  @IsString()
  organizationId: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @Field()
  @IsString()
  type: string; // 'mission', 'annual_report', 'program_description', 'budget', 'impact_story', 'other'

  @Field()
  @IsString()
  content: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any;
}
