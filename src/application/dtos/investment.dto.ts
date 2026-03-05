import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateInvestmentDto {
  @IsString()
  name: string;

  @IsString()
  type: string; // STOCKS, BONDS, MUTUAL_FUNDS, CRYPTO, REAL_ESTATE, OTHER

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  purchasePrice: number;

  @IsNumber()
  currentPrice: number;

  @IsString()
  currency: string;

  @IsDateString()
  purchaseDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvestmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  currentPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
