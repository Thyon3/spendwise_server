import { Test, TestingModule } from '@nestjs/testing';
import { GetSettingsUseCase, UpdateSettingsUseCase } from './settings-ops.use-case';
import { ISettingsRepository } from '../../../domain/repositories/settings.repository.interface';
import { Settings } from '../../../domain/entities/settings.entity';

const mockSettingsRepository = {
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
};

describe('Settings Use Cases', () => {
    let getUseCase: GetSettingsUseCase;
    let updateUseCase: UpdateSettingsUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetSettingsUseCase,
                UpdateSettingsUseCase,
                { provide: ISettingsRepository, useValue: mockSettingsRepository },
            ],
        }).compile();

        getUseCase = module.get<GetSettingsUseCase>(GetSettingsUseCase);
        updateUseCase = module.get<UpdateSettingsUseCase>(UpdateSettingsUseCase);

        jest.resetAllMocks();
    });

    describe('GetSettingsUseCase', () => {
        it('should return existing settings if found', async () => {
            const settings = new Settings('1', 'user-1', 'USD', 'LIGHT', true, new Date(), new Date());
            mockSettingsRepository.findByUserId.mockResolvedValue(settings);

            const result = await getUseCase.execute('user-1');
            expect(result).toEqual(settings);
            expect(mockSettingsRepository.findByUserId).toHaveBeenCalledWith('user-1');
            expect(mockSettingsRepository.create).not.toHaveBeenCalled();
        });

        it('should create and return new settings if not found', async () => {
            mockSettingsRepository.findByUserId.mockResolvedValue(null);
            const newSettings = new Settings('1', 'user-1', 'USD', 'SYSTEM', true, new Date(), new Date());
            mockSettingsRepository.create.mockResolvedValue(newSettings);

            const result = await getUseCase.execute('user-1');
            expect(result).toEqual(newSettings);
            expect(mockSettingsRepository.findByUserId).toHaveBeenCalledWith('user-1');
            expect(mockSettingsRepository.create).toHaveBeenCalledWith({ userId: 'user-1' });
        });
    });

    describe('UpdateSettingsUseCase', () => {
        it('should update settings', async () => {
            const updatedSettings = new Settings('1', 'user-1', 'EUR', 'DARK', false, new Date(), new Date());
            mockSettingsRepository.update.mockResolvedValue(updatedSettings);

            const dto = { preferredCurrency: 'EUR', theme: 'DARK', notificationsEnabled: false };
            const result = await updateUseCase.execute('user-1', dto);

            expect(result).toEqual(updatedSettings);
            expect(mockSettingsRepository.update).toHaveBeenCalledWith('user-1', dto);
        });
    });
});
