import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

@InputType()
export class CreateWorkspaceInput {
  @Field()
  @IsString()
  organizationId: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
