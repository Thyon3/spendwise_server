import { IsString, IsNumber, IsBoolean, IsOptional, IsDateString, IsInt } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  name: string;

  @IsString()
  provider: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  billingCycle: string; // MONTHLY, YEARLY, WEEKLY

  @IsDateString()
  startDate: string;

  @IsDateString()
  nextBillingDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  reminderDays?: number;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  nextBillingDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  reminderDays?: number;
}
