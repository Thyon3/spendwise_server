import { Injectable } from '@nestjs/common';
import { ISettingsRepository } from '../../../domain/repositories/settings.repository.interface';
import { Settings } from '../../../domain/entities/settings.entity';
import { UpdateSettingsDto } from '../../dtos/settings/settings.dto';

@Injectable()
export class GetSettingsUseCase {
    constructor(private readonly settingsRepository: ISettingsRepository) { }

    async execute(userId: string): Promise<Settings> {
        let settings = await this.settingsRepository.findByUserId(userId);
        if (!settings) {
            settings = await this.settingsRepository.create({ userId });
        }
        return settings;
    }
}

@Injectable()
export class UpdateSettingsUseCase {
    constructor(private readonly settingsRepository: ISettingsRepository) { }

    async execute(userId: string, dto: UpdateSettingsDto): Promise<Settings> {
        return this.settingsRepository.update(userId, dto);
    }
}
