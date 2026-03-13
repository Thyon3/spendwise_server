import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache';

export const Cache = (ttl: number = 300) => {
  return SetMetadata(CACHE_KEY, { ttl });
};

export const CacheKey = (key: string) => {
  return SetMetadata('cache_key', key);
};

export const InvalidateCache = (pattern: string) => {
  return SetMetadata('invalidate_cache', pattern);
};
