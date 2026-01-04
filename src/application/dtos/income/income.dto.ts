import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsEnum, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateIncomeDto {
    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsNotEmpty()
    currency: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDateString()
    @IsNotEmpty()
    date: string;

    @IsUUID()
    @IsNotEmpty()
    categoryId: string;
}

export class UpdateIncomeDto {
    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDateString()
    @IsOptional()
    date?: string;

    @IsUUID()
    @IsOptional()
    categoryId?: string;
}

export class IncomeFiltersDto {
    @IsDateString()
    @IsOptional()
    from?: string;

    @IsDateString()
    @IsOptional()
    to?: string;

    @IsUUID()
    @IsOptional()
    categoryId?: string;

    @IsString()
    @IsOptional()
    search?: string;

    @IsString()
    @IsOptional()
    sortBy?: 'date' | 'amount';

    @IsString()
    @IsOptional()
    sortOrder?: 'asc' | 'desc';

    @IsInt()
    @Min(1)
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    page?: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    limit?: number;
}
