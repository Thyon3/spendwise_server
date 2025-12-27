import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvestmentDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() symbol?: string;
  @ApiProperty() @IsNumber() @Min(0) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) purchasePrice: number;
  @ApiProperty() @IsNumber() @Min(0) currentPrice: number;
  @ApiProperty() @IsString() currency: string;
  @ApiProperty() @IsDateString() purchaseDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateInvestmentDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) currentPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
