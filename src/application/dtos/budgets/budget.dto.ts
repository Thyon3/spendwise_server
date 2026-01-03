import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { PeriodType } from '../../../domain/entities/budget.entity';

export class CreateBudgetDto {
    @IsString()
    name: string;

    @IsNumber()
    @Min(0)
    amountLimit: number;

    @IsString()
    currency: string;

    @IsEnum(PeriodType)
    periodType: PeriodType;

    @IsOptional()
    @IsDateString()
    periodStart?: string;

    @IsOptional()
    @IsDateString()
    periodEnd?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;
}

export class UpdateBudgetDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    amountLimit?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsEnum(PeriodType)
    periodType?: PeriodType;

    @IsOptional()
    @IsDateString()
    periodStart?: string;

    @IsOptional()
    @IsDateString()
    periodEnd?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;
}
