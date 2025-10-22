import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';

@InputType()
export class CreateOrganizationInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string;

  @Field({ defaultValue: 'nonprofit' })
  @IsEnum(['nonprofit', 'foundation', 'government', 'other'])
  type: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mission?: string;
}
