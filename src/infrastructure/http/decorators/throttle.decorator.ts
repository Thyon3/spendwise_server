import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  ttl: number;
}

export const Throttle = (limit: number, ttl: number) => 
  SetMetadata(THROTTLE_KEY, { limit, ttl });
