export class StringUtils {
  static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static capitalizeWords(str: string): string {
    if (!str) return '';
    return str
      .split(' ')
      .map((word) => this.capitalize(word))
      .join(' ');
  }

  static truncate(str: string, maxLength: number, suffix: string = '...'): string {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
  }

  static slugify(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static isEmptyOrWhitespace(str: string): boolean {
    return !str || str.trim().length === 0;
  }

  static removeWhitespace(str: string): string {
    return str.replace(/\s+/g, '');
  }

  static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    const maskedUsername =
      username.length > 2
        ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
        : username;
    
    return `${maskedUsername}@${domain}`;
  }

  static maskPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return phone;
    
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
  }
}
