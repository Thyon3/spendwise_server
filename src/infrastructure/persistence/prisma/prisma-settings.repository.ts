import { Injectable } from '@nestjs/common';
import { ISettingsRepository } from '../../../../domain/repositories/settings.repository.interface';
import { Settings } from '../../../../domain/entities/settings.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaSettingsRepository implements ISettingsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findByUserId(userId: string): Promise<Settings | null> {
        const found = await this.prisma.settings.findUnique({ where: { userId } });
        return found ? this.toDomain(found) : null;
    }

    async create(data: Partial<Settings>): Promise<Settings> {
        const created = await this.prisma.settings.create({
            data: {
                userId: data.userId!,
                preferredCurrency: data.preferredCurrency,
                theme: data.theme,
                notificationsEnabled: data.notificationsEnabled,
            },
        });
        return this.toDomain(created);
    }

    async update(userId: string, data: Partial<Settings>): Promise<Settings> {
        const updated = await this.prisma.settings.upsert({
            where: { userId },
            create: {
                userId,
                preferredCurrency: data.preferredCurrency || "USD",
                theme: data.theme || "SYSTEM",
                notificationsEnabled: data.notificationsEnabled ?? true,
            },
            update: {
                preferredCurrency: data.preferredCurrency,
                theme: data.theme,
                notificationsEnabled: data.notificationsEnabled,
            },
        });
        return this.toDomain(updated);
    }

    private toDomain(p: any): Settings {
        return new Settings(
            p.id,
            p.userId,
            p.preferredCurrency,
            p.theme,
            p.notificationsEnabled,
            p.createdAt,
            p.updatedAt,
        );
    }
}
