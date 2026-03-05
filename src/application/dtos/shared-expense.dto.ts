import { IsString, IsNumber, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CreateSharedExpenseDto {
  @IsString()
  expenseId: string;

  @IsString()
  sharedWith: string; // Email or user ID

  @IsString()
  splitType: string; // EQUAL, PERCENTAGE, EXACT_AMOUNT

  @IsNumber()
  splitValue: number;
}

export class UpdateSharedExpenseDto {
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

export class SettleSharedExpenseDto {
  @IsString()
  sharedExpenseId: string;

  @IsDateString()
  paidAt: string;
}
