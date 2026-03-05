export const AppConfig = {
  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  
  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
  
  // Cache
  DEFAULT_CACHE_TTL: 300, // 5 minutes
  LONG_CACHE_TTL: 3600, // 1 hour
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Authentication
  JWT_EXPIRATION: '7d',
  REFRESH_TOKEN_EXPIRATION: '30d',
  PASSWORD_MIN_LENGTH: 8,
  
  // Verification
  VERIFICATION_CODE_LENGTH: 6,
  VERIFICATION_CODE_EXPIRY: 600000, // 10 minutes
  
  // Currency
  DEFAULT_CURRENCY: 'USD',
  SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR'],
  
  // Date Format
  DEFAULT_DATE_FORMAT: 'YYYY-MM-DD',
  DEFAULT_DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  
  // Budget
  BUDGET_ALERT_THRESHOLDS: [50, 75, 90],
  
  // Backup
  BACKUP_RETENTION_DAYS: 30,
  AUTO_BACKUP_ENABLED: true,
};
