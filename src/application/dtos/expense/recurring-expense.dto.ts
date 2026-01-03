import { IsNumber, IsString, IsOptional, IsEnum, IsInt, Min, IsDateString, IsBoolean } from 'class-validator';
import { RecurrenceType } from '../../../domain/entities/recurring-expense.entity';

export class CreateRecurringExpenseDto {
    @IsNumber()
    @Min(0)
    amount: number;

    @IsString()
    currency: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    categoryId: string;

    @IsEnum(RecurrenceType)
    recurrenceType: RecurrenceType;

    @IsInt()
    @Min(1)
    interval: number;

    @IsDateString()
    startDate: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class UpdateRecurringExpenseDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    amount?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsEnum(RecurrenceType)
    recurrenceType?: RecurrenceType;

    @IsOptional()
    @IsInt()
    @Min(1)
    interval?: number;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
