import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  dateFormat: 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';
  timeFormat: '12h' | '24h';
  currency: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    budgetAlerts: boolean;
    goalAchievements: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showPhone: boolean;
    analyticsOptIn: boolean;
  };
  ui: {
    defaultView: 'dashboard' | 'expenses' | 'analytics';
    itemsPerPage: number;
    showCharts: boolean;
    compactMode: boolean;
  };
  features: {
    experimentalFeatures: boolean;
    betaFeatures: boolean;
    advancedAnalytics: boolean;
    aiSuggestions: boolean;
  };
}

@Injectable()
export class UserPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferences: true,
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Return default preferences if none exist
    return user.preferences ? JSON.parse(user.preferences) : this.getDefaultPreferences();
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const currentPreferences = await this.getUserPreferences(userId);
    const updatedPreferences = { ...currentPreferences, ...preferences };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: JSON.stringify(updatedPreferences),
      },
    });

    return updatedPreferences;
  }

  async resetUserPreferences(userId: string): Promise<UserPreferences> {
    const defaultPreferences = this.getDefaultPreferences();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: JSON.stringify(defaultPreferences),
      },
    });

    return defaultPreferences;
  }

  async updatePreference(
    userId: string,
    category: keyof UserPreferences,
    key: string,
    value: any
  ): Promise<UserPreferences> {
    const currentPreferences = await this.getUserPreferences(userId);
    
    // Update the specific preference
    const updatedCategory = { ...currentPreferences[category] };
    (updatedCategory as any)[key] = value;

    const updatedPreferences = {
      ...currentPreferences,
      [category]: updatedCategory,
    };

    return this.updateUserPreferences(userId, updatedPreferences);
  }

  async getPreference(
    userId: string,
    category: keyof UserPreferences,
    key: string
  ): Promise<any> {
    const preferences = await this.getUserPreferences(userId);
    return (preferences[category] as any)[key];
  }

  async togglePreference(
    userId: string,
    category: keyof UserPreferences,
    key: string
  ): Promise<UserPreferences> {
    const currentValue = await this.getPreference(userId, category, key);
    return this.updatePreference(userId, category, key, !currentValue);
  }

  async getThemePreference(userId: string): Promise<'light' | 'dark' | 'auto'> {
    return this.getPreference(userId, 'theme', 'theme');
  }

  async setThemePreference(userId: string, theme: 'light' | 'dark' | 'auto'): Promise<UserPreferences> {
    return this.updatePreference(userId, 'theme', 'theme', theme);
  }

  async getNotificationPreferences(userId: string): Promise<UserPreferences['notifications']> {
    return this.getPreference(userId, 'notifications', 'notifications');
  }

  async updateNotificationPreferences(
    userId: string,
    notifications: Partial<UserPreferences['notifications']>
  ): Promise<UserPreferences> {
    const currentNotifications = await this.getNotificationPreferences(userId);
    const updatedNotifications = { ...currentNotifications, ...notifications };
    return this.updatePreference(userId, 'notifications', 'notifications', updatedNotifications);
  }

  async getCurrencyPreference(userId: string): Promise<string> {
    return this.getPreference(userId, 'ui', 'currency');
  }

  async setCurrencyPreference(userId: string, currency: string): Promise<UserPreferences> {
    return this.updatePreference(userId, 'ui', 'currency', currency);
  }

  async getLanguagePreference(userId: string): Promise<string> {
    return this.getPreference(userId, 'ui', 'language');
  }

  async setLanguagePreference(userId: string, language: string): Promise<UserPreferences> {
    return this.updatePreference(userId, 'ui', 'language', language);
  }

  async exportUserPreferences(userId: string): Promise<UserPreferences> {
    return this.getUserPreferences(userId);
  }

  async importUserPreferences(userId: string, preferences: UserPreferences): Promise<UserPreferences> {
    // Validate preferences before importing
    this.validatePreferences(preferences);
    
    return this.updateUserPreferences(userId, preferences);
  }

  async getPublicPreferences(userId: string): Promise<Partial<UserPreferences>> {
    const preferences = await this.getUserPreferences(userId);
    
    // Only return public-safe preferences
    return {
      theme: preferences.theme,
      language: preferences.language,
      dateFormat: preferences.dateFormat,
      timeFormat: preferences.timeFormat,
      currency: preferences.currency,
      ui: preferences.ui,
    };
  }

  async syncPreferencesAcrossDevices(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    // In a real implementation, this would sync preferences across multiple devices
    // For now, we'll just update the preferences
    await this.updateUserPreferences(userId, preferences);
  }

  async getPreferenceHistory(userId: string): Promise<Array<{
    timestamp: Date;
    changes: Partial<UserPreferences>;
  }>> {
    // In a real implementation, this would track preference changes over time
    // For now, we'll return mock data
    return [
      {
        timestamp: new Date(),
        changes: { theme: 'dark' },
      },
    ];
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'light',
      language: 'en',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      currency: 'USD',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: true,
        budgetAlerts: true,
        goalAchievements: true,
        weeklyReports: false,
        monthlyReports: true,
      },
      privacy: {
        profileVisibility: 'private',
        showEmail: false,
        showPhone: false,
        analyticsOptIn: true,
      },
      ui: {
        defaultView: 'dashboard',
        itemsPerPage: 20,
        showCharts: true,
        compactMode: false,
      },
      features: {
        experimentalFeatures: false,
        betaFeatures: false,
        advancedAnalytics: false,
        aiSuggestions: true,
      },
    };
  }

  private validatePreferences(preferences: UserPreferences): void {
    // Validate theme
    if (!['light', 'dark', 'auto'].includes(preferences.theme)) {
      throw new HttpException('Invalid theme preference', HttpStatus.BAD_REQUEST);
    }

    // Validate language
    if (typeof preferences.language !== 'string' || preferences.language.length !== 2) {
      throw new HttpException('Invalid language preference', HttpStatus.BAD_REQUEST);
    }

    // Validate date format
    if (!['MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd'].includes(preferences.dateFormat)) {
      throw new HttpException('Invalid date format preference', HttpStatus.BAD_REQUEST);
    }

    // Validate time format
    if (!['12h', '24h'].includes(preferences.timeFormat)) {
      throw new HttpException('Invalid time format preference', HttpStatus.BAD_REQUEST);
    }

    // Validate currency
    if (typeof preferences.currency !== 'string' || preferences.currency.length !== 3) {
      throw new HttpException('Invalid currency preference', HttpStatus.BAD_REQUEST);
    }

    // Validate timezone
    if (typeof preferences.timezone !== 'string' || preferences.timezone.length === 0) {
      throw new HttpException('Invalid timezone preference', HttpStatus.BAD_REQUEST);
    }

    // Validate privacy visibility
    if (!['public', 'private', 'friends'].includes(preferences.privacy.profileVisibility)) {
      throw new HttpException('Invalid privacy visibility preference', HttpStatus.BAD_REQUEST);
    }

    // Validate default view
    if (!['dashboard', 'expenses', 'analytics'].includes(preferences.ui.defaultView)) {
      throw new HttpException('Invalid default view preference', HttpStatus.BAD_REQUEST);
    }

    // Validate items per page
    if (typeof preferences.ui.itemsPerPage !== 'number' || 
        preferences.ui.itemsPerPage < 5 || 
        preferences.ui.itemsPerPage > 100) {
      throw new HttpException('Items per page must be between 5 and 100', HttpStatus.BAD_REQUEST);
    }
  }

  async getAvailableThemes(): Promise<Array<{
    value: string;
    label: string;
    description: string;
  }>> {
    return [
      {
        value: 'light',
        label: 'Light',
        description: 'Light theme with bright colors',
      },
      {
        value: 'dark',
        label: 'Dark',
        description: 'Dark theme for low-light environments',
      },
      {
        value: 'auto',
        label: 'Auto',
        description: 'Automatically switch based on system preferences',
      },
    ];
  }

  async getAvailableLanguages(): Promise<Array<{
    code: string;
    name: string;
    nativeName: string;
  }>> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
    ];
  }

  async getAvailableCurrencies(): Promise<Array<{
    code: string;
    name: string;
    symbol: string;
  }>> {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    ];
  }

  async getAvailableTimezones(): Promise<Array<{
    value: string;
    label: string;
    offset: string;
  }>> {
    return [
      { value: 'UTC', label: 'UTC', offset: '+00:00' },
      { value: 'America/New_York', label: 'Eastern Time', offset: '-05:00' },
      { value: 'America/Chicago', label: 'Central Time', offset: '-06:00' },
      { value: 'America/Denver', label: 'Mountain Time', offset: '-07:00' },
      { value: 'America/Los_Angeles', label: 'Pacific Time', offset: '-08:00' },
      { value: 'Europe/London', label: 'London', offset: '+00:00' },
      { value: 'Europe/Paris', label: 'Paris', offset: '+01:00' },
      { value: 'Europe/Berlin', label: 'Berlin', offset: '+01:00' },
      { value: 'Asia/Tokyo', label: 'Tokyo', offset: '+09:00' },
      { value: 'Asia/Shanghai', label: 'Shanghai', offset: '+08:00' },
    ];
  }
}
