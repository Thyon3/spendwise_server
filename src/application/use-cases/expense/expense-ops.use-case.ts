import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IExpenseRepository, ExpenseFilters } from '../../../domain/repositories/expense.repository.interface';
import { Expense } from '../../../domain/entities/expense.entity';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseFiltersDto } from '../../dtos/expense/expense.dto';

@Injectable()
export class CreateExpenseUseCase {
    constructor(private readonly expenseRepository: IExpenseRepository) { }

    async execute(userId: string, dto: CreateExpenseDto): Promise<Expense> {
        return this.expenseRepository.create({
            ...dto,
            userId,
            date: new Date(dto.date),
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

    async execute(userId: string, id: string, dto: UpdateExpenseDto): Promise<Expense> {
        const existing = await this.expenseRepository.findById(id);
        if (!existing) throw new NotFoundException('Expense not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not owner');

        return this.expenseRepository.update(id, {
            ...dto,
            date: dto.date ? new Date(dto.date) : undefined,
        });
    }
}

@Injectable()
export class DeleteExpenseUseCase {
    constructor(private readonly expenseRepository: IExpenseRepository) { }

    async execute(userId: string, id: string): Promise<void> {
        const existing = await this.expenseRepository.findById(id);
        if (!existing) throw new NotFoundException('Expense not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not owner');

        await this.expenseRepository.delete(id);
    }
}
