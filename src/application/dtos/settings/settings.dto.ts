import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
    @IsString()
    @IsOptional()
    preferredCurrency?: string;

    @IsString()
    @IsOptional()
    theme?: string;

    @IsBoolean()
    @IsOptional()
    notificationsEnabled?: boolean;
}
