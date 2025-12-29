import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
    @ApiProperty({ example: 'groceries' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;
}

export class UpdateTagDto {
    @ApiPropertyOptional({ example: 'food' })
    @IsString()
    @IsOptional()
    @MaxLength(50)
    name?: string;
}
