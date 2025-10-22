import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';

@InputType()
export class UpdateProposalTemplateInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
