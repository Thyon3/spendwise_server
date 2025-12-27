import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWishlistItemDto {
    @ApiProperty() @IsString() name: string;
    @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
    @ApiProperty() @IsNumber() @Min(0) estimatedCost: number;
    @ApiProperty() @IsString() currency: string;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(5) priority?: number;
    @ApiPropertyOptional() @IsOptional() @IsDateString() targetDate?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() url?: string;
}

export class UpdateWishlistItemDto {
    @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(5) priority?: number;
    @ApiPropertyOptional() @IsOptional() @IsDateString() targetDate?: string;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isPurchased?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsString() url?: string;
}
