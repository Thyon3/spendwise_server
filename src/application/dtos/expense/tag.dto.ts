import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateTagDto {
    @IsString()
    @MinLength(1)
    @MaxLength(30)
    name: string;
}

export class UpdateTagDto {
    @IsString()
    @MinLength(1)
    @MaxLength(30)
    name: string;
}
