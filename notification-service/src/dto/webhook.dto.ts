import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class WebhookDto {
    @IsOptional()
    @IsString()
    message?: string;

    @IsOptional()
    @IsDateString()
    timestamp?: string;

    @IsOptional()
    @IsBoolean()
    cronJob?: boolean;

    @IsOptional()
    @IsString()
    source?: string;
}