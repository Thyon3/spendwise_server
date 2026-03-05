import { IsOptional, IsString, IsNumber, IsDateString, IsArray } from 'class-validator';

export class ExpenseFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsString()
  searchQuery?: string;

  @IsOptional()
  @IsString()
  sortBy?: string; // date, amount, category

  @IsOptional()
  @IsString()
  sortOrder?: string; // asc, desc

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class IncomeFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsString()
  searchQuery?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
