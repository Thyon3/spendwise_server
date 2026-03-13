import { SetMetadata } from '@nestjs/common';

export const TWO_FACTOR_AUTH_KEY = 'twoFactorAuth';
export const RequireTwoFactor = () => SetMetadata(TWO_FACTOR_AUTH_KEY, true);
