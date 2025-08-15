import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';

@InputType('CreateCronInput')
export class CreateCronJobDto {
    @Field()
    @IsString()
    @IsNotEmpty()
    uri: string;

    @Field()
    @IsEnum(['GET', 'POST', 'PUT', 'DELETE'], {
        message: 'httpMethod must be one of: GET, POST, PUT, DELETE'
    })
    httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    body?: string;

    @Field()
    @IsString()
    @IsNotEmpty()
    schedule: string;

    @Field()
    @IsString()
    @IsNotEmpty()
    timeZone: string;
}