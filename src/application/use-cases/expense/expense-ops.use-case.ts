import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IExpenseRepository, ExpenseFilters } from '../../../domain/repositories/expense.repository.interface';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseFiltersDto } from '../../dtos/expense/expense.dto';
import { Expense } from '../../../domain/entities/expense.entity';

@Injectable()
export class CreateExpenseUseCase {
    constructor(private readonly expenseRepository: IExpenseRepository) { }

    async execute(userId: string, dto: CreateExpenseDto): Promise<Expense> {
        return this.expenseRepository.create({
            ...dto,
            date: new Date(dto.date),
            userId,
        });
    }
}

@Injectable()
export class ListExpensesForUserUseCase {
    constructor(private readonly expenseRepository: IExpenseRepository) { }

    async execute(userId: string, filtersDto: ExpenseFiltersDto): Promise<Expense[]> {
        const filters: ExpenseFilters = {
            ...filtersDto,
            from: filtersDto.from ? new Date(filtersDto.from) : undefined,
            to: filtersDto.to ? new Date(filtersDto.to) : undefined,
        };
        return this.expenseRepository.findByUser(userId, filters);
    }
}

@Injectable()
export class UpdateExpenseUseCase {
    constructor(private readonly expenseRepository: IExpenseRepository) { }

    async execute(userId: string, expenseId: string, dto: UpdateExpenseDto): Promise<Expense> {
        const expense = await this.expenseRepository.findById(expenseId);
        if (!expense) throw new NotFoundException('Expense not found');
        if (expense.userId !== userId) throw new ForbiddenException('You do not own this expense');

        return this.expenseRepository.update(expenseId, {
            ...dto,
            date: dto.date ? new Date(dto.date) : undefined,
        });
    }
}

@Injectable()
export class DeleteExpenseUseCase {
    constructor(private readonly expenseRepository: IExpenseRepository) { }

    async execute(userId: string, expenseId: string): Promise<void> {
        const expense = await this.expenseRepository.findById(expenseId);
        if (!expense) throw new NotFoundException('Expense not found');
        if (expense.userId !== userId) throw new ForbiddenException('You do not own this expense');

        return this.expenseRepository.delete(expenseId);
    }
}
