import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsEmail, IsUrl, Min } from 'class-validator';

@InputType()
export class BasicInfoInput {
  @Field()
  @IsString()
  organizationId: string;

  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  legalName?: string;

  @Field()
  @IsString()
  taxId: string;

  @Field()
  @IsString()
  type: string;

  @Field()
  @IsInt()
  @Min(1800)
  yearFounded: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @Field()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field()
  @IsString()
  address: string;
}
