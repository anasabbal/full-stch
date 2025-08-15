import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID } from 'class-validator';

@InputType('UpdateCronInput')
export class UpdateCronJobDto {
    @Field(() => ID)
    @IsUUID()
    id: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    uri?: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsEnum(['GET', 'POST', 'PUT', 'DELETE'])
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    body?: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    schedule?: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    timeZone?: string;

    @Field({ nullable: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}