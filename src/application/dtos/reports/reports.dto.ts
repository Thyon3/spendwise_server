import { IsDateString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class GetSpendingSummaryDto {
    @IsDateString()
    from: string;

    @IsDateString()
    to: string;

    @IsOptional()
    @IsArray()
    categoryIds?: string[];

    @IsOptional()
    @IsArray()
    tagIds?: string[];
}

export class GetSpendingTrendsDto {
    @IsDateString()
    from: string;

    @IsDateString()
    to: string;

    @IsEnum(['day', 'week', 'month'])
    granularity: 'day' | 'week' | 'month';
}
