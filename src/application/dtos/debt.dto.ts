import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateDebtDto {
  @IsString()
  name: string;

  @IsString()
  type: string; // LOAN, CREDIT_CARD, MORTGAGE, PERSONAL

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  remainingAmount: number;

  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @IsString()
  currency: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  minimumPayment?: number;
}

export class UpdateDebtDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  remainingAmount?: number;

  @IsOptional()
  @IsNumber()
  interestRate?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  minimumPayment?: number;

  @IsOptional()
  @IsBoolean()
  isPaidOff?: boolean;
}

export class CreateDebtPaymentDto {
  @IsString()
  debtId: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  principalAmount: number;

  @IsNumber()
  interestAmount: number;

  @IsDateString()
  paymentDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
