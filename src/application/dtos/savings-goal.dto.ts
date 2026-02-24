import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateSavingsGoalDto {
  @IsString()
  name: string;

  @IsNumber()
  targetAmount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSavingsGoalDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  targetAmount?: number;

  @IsOptional()
  @IsNumber()
  currentAmount?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
