import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
    CreateBudgetUseCase,
    ListBudgetsUseCase,
    UpdateBudgetUseCase,
    DeleteBudgetUseCase,
    GetBudgetStatusUseCase,
} from './budget.use-case';
import { IBudgetRepository } from '../../../domain/repositories/budget.repository.interface';
import { Budget, BudgetStatus, PeriodType } from '../../../domain/entities/budget.entity';

const mockBudgetRepository = {
    create: jest.fn(),
    findByUser: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getBudgetStatus: jest.fn(),
    getAllBudgetStatuses: jest.fn(),
};

describe('Budget Use Cases', () => {
    let createUseCase: CreateBudgetUseCase;
    let listUseCase: ListBudgetsUseCase;
    let updateUseCase: UpdateBudgetUseCase;
    let deleteUseCase: DeleteBudgetUseCase;
    let getStatusUseCase: GetBudgetStatusUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateBudgetUseCase,
                ListBudgetsUseCase,
                UpdateBudgetUseCase,
                DeleteBudgetUseCase,
                GetBudgetStatusUseCase,
                { provide: IBudgetRepository, useValue: mockBudgetRepository },
            ],
        }).compile();

        createUseCase = module.get<CreateBudgetUseCase>(CreateBudgetUseCase);
        listUseCase = module.get<ListBudgetsUseCase>(ListBudgetsUseCase);
        updateUseCase = module.get<UpdateBudgetUseCase>(UpdateBudgetUseCase);
        deleteUseCase = module.get<DeleteBudgetUseCase>(DeleteBudgetUseCase);
        getStatusUseCase = module.get<GetBudgetStatusUseCase>(GetBudgetStatusUseCase);

        jest.clearAllMocks();
    });

    describe('CreateBudgetUseCase', () => {
        it('should create a budget', async () => {
            const dto = {
                name: 'Groceries',
                amountLimit: 500,
                currency: 'USD',
                periodType: PeriodType.MONTHLY,
            };
            const userId = 'user-1';
            const expected = new Budget({ id: '1', ...dto, userId, createdAt: new Date(), updatedAt: new Date() });

            mockBudgetRepository.create.mockResolvedValue(expected);

            const result = await createUseCase.execute(userId, dto);
            expect(result).toEqual(expected);
            expect(mockBudgetRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId, name: 'Groceries' }));
        });
    });

    describe('ListBudgetsUseCase', () => {
        it('should return budgets for user', async () => {
            const budgets = [new Budget({ id: '1', userId: 'user-1', name: 'Test', amountLimit: 100, currency: 'USD', periodType: PeriodType.WEEKLY, createdAt: new Date(), updatedAt: new Date() })];
            mockBudgetRepository.findByUser.mockResolvedValue(budgets);

            const result = await listUseCase.execute('user-1');
            expect(result).toEqual(budgets);
            expect(mockBudgetRepository.findByUser).toHaveBeenCalledWith('user-1');
        });
    });

    describe('GetBudgetStatusUseCase', () => {
        it('should return all statuses if no budgetId provided', async () => {
            const status = new BudgetStatus({
                budgetId: '1',
                budgetName: 'Test',
                periodStart: new Date(),
                periodEnd: new Date(),
                amountLimit: 100,
                amountSpent: 50,
                percentageUsed: 50,
                isOverLimit: false,
                isNearLimit: false,
            });
            mockBudgetRepository.getAllBudgetStatuses.mockResolvedValue([status]);

            const result = await getStatusUseCase.execute('user-1');
            expect(result).toEqual([status]);
            expect(mockBudgetRepository.getAllBudgetStatuses).toHaveBeenCalled();
        });

        it('should return single status if budgetId provided', async () => {
            const budget = new Budget({ id: '1', userId: 'user-1', name: 'Test', amountLimit: 100, currency: 'USD', periodType: PeriodType.WEEKLY, createdAt: new Date(), updatedAt: new Date() });
            mockBudgetRepository.findById.mockResolvedValue(budget);

            const status = new BudgetStatus({
                budgetId: '1',
                budgetName: 'Test',
                periodStart: new Date(),
                periodEnd: new Date(),
                amountLimit: 100,
                amountSpent: 50,
                percentageUsed: 50,
                isOverLimit: false,
                isNearLimit: false,
            });
            mockBudgetRepository.getBudgetStatus.mockResolvedValue(status);

            const result = await getStatusUseCase.execute('user-1', '1');
            expect(result).toEqual(status);
        });

        it('should throw Forbidden if not owner', async () => {
            const budget = new Budget({ id: '1', userId: 'user-2', name: 'Test', amountLimit: 100, currency: 'USD', periodType: PeriodType.WEEKLY, createdAt: new Date(), updatedAt: new Date() });
            mockBudgetRepository.findById.mockResolvedValue(budget);

            await expect(getStatusUseCase.execute('user-1', '1')).rejects.toThrow(ForbiddenException);
        });
    });
});
