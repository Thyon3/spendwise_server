export class EnvUtils {
  static get(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || '';
  }

  static getNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue || 0;
  }

  static getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = process.env[key];
    if (!value) return defaultValue || false;
    return value.toLowerCase() === 'true';
  }

  static getArray(key: string, separator: string = ','): string[] {
    const value = process.env[key];
    return value ? value.split(separator).map((v) => v.trim()) : [];
  }

  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  static isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  static required(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value;
  }
}
