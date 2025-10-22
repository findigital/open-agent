import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';

@InputType()
export class CreateProposalTemplateInput {
  @Field()
  @IsString()
  workspaceId: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field()
  @IsString()
  category: string;

  @Field({ defaultValue: false })
  @IsBoolean()
  isPublic: boolean;
}
