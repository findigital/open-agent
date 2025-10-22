import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

@InputType()
export class UpdateOrganizationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['nonprofit', 'foundation', 'government', 'other'])
  type?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mission?: string;
}
