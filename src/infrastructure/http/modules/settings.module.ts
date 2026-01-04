import { Module } from '@nestjs/common';
import { SettingsController } from '../controllers/settings.controller';
import { GetSettingsUseCase, UpdateSettingsUseCase } from '../../../application/use-cases/settings/settings-ops.use-case';
import { ISettingsRepository } from '../../../domain/repositories/settings.repository.interface';
import { PrismaSettingsRepository } from '../../persistence/prisma/prisma-settings.repository';

@Module({
    controllers: [SettingsController],
    providers: [
        GetSettingsUseCase,
        UpdateSettingsUseCase,
        {
            provide: ISettingsRepository,
            useClass: PrismaSettingsRepository,
        },
    ],
    exports: [ISettingsRepository],
})
export class SettingsModule { }
