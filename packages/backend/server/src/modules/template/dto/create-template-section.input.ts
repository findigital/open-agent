import { Field, InputType, Int } from '@nestjs/graphql';
import { IsString, IsBoolean, IsInt, IsOptional, MinLength, MaxLength } from 'class-validator';

@InputType()
export class CreateTemplateSectionInput {
  @Field()
  @IsString()
  templateId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field()
  @IsString()
  type: string;

  @Field(() => Int)
  @IsInt()
  order: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  wordLimit?: number;

  @Field({ defaultValue: false })
  @IsBoolean()
  required: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  promptGuidance?: string;
}
