import { IsNumber, IsString, IsOptional, IsDateString, IsInt, Min, Max, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
    @IsNumber()
    @Min(0)
    amount: number;

    @IsString()
    currency: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsDateString()
    date: string;

    @IsString()
    categoryId: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tagIds?: string[];
}

export class UpdateExpenseDto {
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
    @IsDateString()
    date?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tagIds?: string[];
}

export class ExpenseFiltersDto {
    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsString()
    tagId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(['date', 'amount'])
    sortBy?: 'date' | 'amount';

    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}
