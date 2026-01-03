import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
    CreateExpenseUseCase,
    ListExpensesForUserUseCase,
    UpdateExpenseUseCase,
    DeleteExpenseUseCase,
} from './expense-ops.use-case';
import { IExpenseRepository } from '../../../domain/repositories/expense.repository.interface';
import { Expense } from '../../../domain/entities/expense.entity';

const mockExpenseRepository = {
    create: jest.fn(),
    findByUser: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
};

describe('Expense Use Cases', () => {
    let createUseCase: CreateExpenseUseCase;
    let listUseCase: ListExpensesForUserUseCase;
    let updateUseCase: UpdateExpenseUseCase;
    let deleteUseCase: DeleteExpenseUseCase;
    let repository: IExpenseRepository;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateExpenseUseCase,
                ListExpensesForUserUseCase,
                UpdateExpenseUseCase,
                DeleteExpenseUseCase,
                { provide: IExpenseRepository, useValue: mockExpenseRepository },
            ],
        }).compile();

        createUseCase = module.get<CreateExpenseUseCase>(CreateExpenseUseCase);
        listUseCase = module.get<ListExpensesForUserUseCase>(ListExpensesForUserUseCase);
        updateUseCase = module.get<UpdateExpenseUseCase>(UpdateExpenseUseCase);
        deleteUseCase = module.get<DeleteExpenseUseCase>(DeleteExpenseUseCase);
        repository = module.get<IExpenseRepository>(IExpenseRepository);

        jest.clearAllMocks();
    });

    describe('CreateExpenseUseCase', () => {
        it('should create an expense', async () => {
            const dto = {
                amount: 100,
                currency: 'USD',
                date: new Date().toISOString(),
                categoryId: 'cat-1',
                description: 'Test',
            };
            const userId = 'user-1';
            const expectedExpense = new Expense({ id: '1', ...dto, userId, date: new Date(dto.date), createdAt: new Date(), updatedAt: new Date() });

            mockExpenseRepository.create.mockResolvedValue(expectedExpense);

            const result = await createUseCase.execute(userId, dto);
            expect(result).toEqual(expectedExpense);
            expect(mockExpenseRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                userId,
                amount: 100,
            }));
        });
    });

    describe('ListExpensesForUserUseCase', () => {
        it('should return a list of expenses', async () => {
            const expenses = [new Expense({ id: '1', amount: 50, currency: 'USD', date: new Date(), userId: 'user-1', categoryId: 'cat-1', createdAt: new Date(), updatedAt: new Date() })];
            mockExpenseRepository.findByUser.mockResolvedValue(expenses);

            const result = await listUseCase.execute('user-1', {});
            expect(result).toEqual(expenses);
            expect(mockExpenseRepository.findByUser).toHaveBeenCalledWith('user-1', expect.anything());
        });
    });

    describe('UpdateExpenseUseCase', () => {
        it('should throw NotFoundException if expense does not exist', async () => {
            mockExpenseRepository.findById.mockResolvedValue(null);
            await expect(updateUseCase.execute('user-1', '1', {})).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if user is not owner', async () => {
            mockExpenseRepository.findById.mockResolvedValue(new Expense({ id: '1', userId: 'user-2', amount: 10, currency: 'USD', date: new Date(), categoryId: 'c1', createdAt: new Date(), updatedAt: new Date() }));
            await expect(updateUseCase.execute('user-1', '1', {})).rejects.toThrow(ForbiddenException);
        });

        it('should update expense if owner', async () => {
            const existing = new Expense({ id: '1', userId: 'user-1', amount: 10, currency: 'USD', date: new Date(), categoryId: 'c1', createdAt: new Date(), updatedAt: new Date() });
            mockExpenseRepository.findById.mockResolvedValue(existing);

            const updated = { ...existing, amount: 20 };
            mockExpenseRepository.update.mockResolvedValue(updated);

            const result = await updateUseCase.execute('user-1', '1', { amount: 20 });
            expect(result.amount).toBe(20);
            expect(mockExpenseRepository.update).toHaveBeenCalled();
        });
    });

    describe('DeleteExpenseUseCase', () => {
        it('should throw ForbiddenException if not owner', async () => {
            mockExpenseRepository.findById.mockResolvedValue(new Expense({ id: '1', userId: 'user-2', amount: 10, currency: 'USD', date: new Date(), categoryId: 'c1', createdAt: new Date(), updatedAt: new Date() }));
            await expect(deleteUseCase.execute('user-1', '1')).rejects.toThrow(ForbiddenException);
        });

        it('should delete expense if owner', async () => {
            mockExpenseRepository.findById.mockResolvedValue(new Expense({ id: '1', userId: 'user-1', amount: 10, currency: 'USD', date: new Date(), categoryId: 'c1', createdAt: new Date(), updatedAt: new Date() }));
            mockExpenseRepository.delete.mockResolvedValue(undefined);

            await deleteUseCase.execute('user-1', '1');
            expect(mockExpenseRepository.delete).toHaveBeenCalledWith('1');
        });
    });
});
