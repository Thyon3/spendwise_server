export const APP_CONFIG = {
  NAME: 'Expense Tracker',
  VERSION: '1.0.0',
  DESCRIPTION: 'Professional expense tracking application',
} as const;

export const API_CONFIG = {
  PREFIX: '/api',
  VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds
} as const;

export const AUTH_CONFIG = {
  JWT_EXPIRES_IN: '24h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  BCRYPT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
} as const;

export const CACHE_CONFIG = {
  DEFAULT_TTL: 300, // 5 minutes
  MAX_KEYS: 1000,
  CHECK_PERIOD: 600, // 10 minutes
} as const;

export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS: 100,
  SKIP_SUCCESSFUL_REQUESTS: false,
} as const;

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
