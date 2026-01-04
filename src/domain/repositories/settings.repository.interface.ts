import { Settings } from '../entities/settings.entity';

export abstract class ISettingsRepository {
    abstract findByUserId(userId: string): Promise<Settings | null>;
    abstract update(userId: string, settings: Partial<Settings>): Promise<Settings>;
    abstract create(settings: Partial<Settings>): Promise<Settings>;
}
