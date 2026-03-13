import { IsString, IsNotEmpty } from 'class-validator';

export class EnableTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class VerifyTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class TwoFactorSetupResponseDto {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}
