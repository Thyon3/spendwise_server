import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
    CreateIncomeUseCase,
    ListIncomesForUserUseCase,
    UpdateIncomeUseCase,
    DeleteIncomeUseCase,
} from './income-ops.use-case';
import { IIncomeRepository } from '../../../domain/repositories/income.repository.interface';
import { Income } from '../../../domain/entities/income.entity';

const mockIncomeRepository = {
    create: jest.fn(),
    findByUser: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};

describe('Income Use Cases', () => {
    let createUseCase: CreateIncomeUseCase;
    let listUseCase: ListIncomesForUserUseCase;
    let updateUseCase: UpdateIncomeUseCase;
    let deleteUseCase: DeleteIncomeUseCase;
    let repository: IIncomeRepository;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateIncomeUseCase,
                ListIncomesForUserUseCase,
                UpdateIncomeUseCase,
                DeleteIncomeUseCase,
                { provide: IIncomeRepository, useValue: mockIncomeRepository },
            ],
        }).compile();

        createUseCase = module.get<CreateIncomeUseCase>(CreateIncomeUseCase);
        listUseCase = module.get<ListIncomesForUserUseCase>(ListIncomesForUserUseCase);
        updateUseCase = module.get<UpdateIncomeUseCase>(UpdateIncomeUseCase);
        deleteUseCase = module.get<DeleteIncomeUseCase>(DeleteIncomeUseCase);
        repository = module.get<IIncomeRepository>(IIncomeRepository);

        jest.resetAllMocks();
    });

    describe('CreateIncomeUseCase', () => {
        it('should create an income', async () => {
            const dto = {
                amount: 2000,
                currency: 'USD',
                date: new Date().toISOString(),
                categoryId: 'cat-inc-1',
                description: 'Salary',
            };
            const userId = 'user-1';
            const expectedIncome = new Income('1', 2000, 'USD', 'Salary', new Date(dto.date), userId, 'cat-inc-1', new Date(), new Date());

            mockIncomeRepository.create.mockResolvedValue(expectedIncome);

            const result = await createUseCase.execute(userId, dto);
            expect(result).toEqual(expectedIncome);
            expect(mockIncomeRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                userId,
                amount: 2000,
            }));
        });
    });

    describe('ListIncomesForUserUseCase', () => {
        it('should return a list of incomes', async () => {
            const incomes = [new Income('1', 3000, 'USD', null, new Date(), 'user-1', 'cat-inc-1', new Date(), new Date())];
            mockIncomeRepository.findByUser.mockResolvedValue(incomes);

            const result = await listUseCase.execute('user-1', {});
            expect(result).toEqual(incomes);
            expect(mockIncomeRepository.findByUser).toHaveBeenCalledWith('user-1', expect.anything());
        });
    });

    describe('UpdateIncomeUseCase', () => {
        it('should throw NotFoundException if income does not exist', async () => {
            mockIncomeRepository.findById.mockResolvedValue(null);
            await expect(updateUseCase.execute('user-1', '1', {})).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if user is not owner', async () => {
            mockIncomeRepository.findById.mockResolvedValue(new Income('1', 100, 'USD', null, new Date(), 'user-2', 'c1', new Date(), new Date()));
            await expect(updateUseCase.execute('user-1', '1', {})).rejects.toThrow(ForbiddenException);
        });

        it('should update income if owner', async () => {
            const existing = new Income('1', 100, 'USD', null, new Date(), 'user-1', 'c1', new Date(), new Date());
            mockIncomeRepository.findById.mockResolvedValue(existing);

            const updated = new Income('1', 200, 'USD', null, new Date(), 'user-1', 'c1', new Date(), new Date());
            mockIncomeRepository.update.mockResolvedValue(updated);

            const result = await updateUseCase.execute('user-1', '1', { amount: 200 });
            expect(result.amount).toBe(200);
            expect(mockIncomeRepository.update).toHaveBeenCalled();
        });
    });

    describe('DeleteIncomeUseCase', () => {
        it('should throw ForbiddenException if not owner', async () => {
            mockIncomeRepository.findById.mockResolvedValue(new Income('1', 100, 'USD', null, new Date(), 'user-2', 'c1', new Date(), new Date()));
            await expect(deleteUseCase.execute('user-1', '1')).rejects.toThrow(ForbiddenException);
        });

        it('should delete income if owner', async () => {
            mockIncomeRepository.findById.mockResolvedValue(new Income('1', 100, 'USD', null, new Date(), 'user-1', 'c1', new Date(), new Date()));
            mockIncomeRepository.delete.mockResolvedValue(undefined);

            await deleteUseCase.execute('user-1', '1');
            expect(mockIncomeRepository.delete).toHaveBeenCalledWith('1');
        });
    });
});
