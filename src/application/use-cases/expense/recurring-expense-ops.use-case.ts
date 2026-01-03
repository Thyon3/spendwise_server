import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IRecurringExpenseRepository } from '../../../domain/repositories/recurring-expense.repository.interface';
import { RecurringExpense } from '../../../domain/entities/recurring-expense.entity';
import { CreateRecurringExpenseDto, UpdateRecurringExpenseDto } from '../../dtos/expense/recurring-expense.dto';

@Injectable()
export class CreateRecurringExpenseUseCase {
    constructor(private readonly recurringRepository: IRecurringExpenseRepository) { }

    async execute(userId: string, dto: CreateRecurringExpenseDto): Promise<RecurringExpense> {
        return this.recurringRepository.create({
            ...dto,
            userId,
            startDate: new Date(dto.startDate),
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            isActive: true,
        });
    }
}

@Injectable()
export class ListRecurringExpensesUseCase {
    constructor(private readonly recurringRepository: IRecurringExpenseRepository) { }

    async execute(userId: string): Promise<RecurringExpense[]> {
        return this.recurringRepository.findByUser(userId);
    }
}

@Injectable()
export class UpdateRecurringExpenseUseCase {
    constructor(private readonly recurringRepository: IRecurringExpenseRepository) { }

    async execute(userId: string, id: string, dto: UpdateRecurringExpenseDto): Promise<RecurringExpense> {
        const existing = await this.recurringRepository.findById(id);
        if (!existing) throw new NotFoundException('Recurring expense not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not owner');

        return this.recurringRepository.update(id, {
            ...dto,
            startDate: dto.startDate ? new Date(dto.startDate) : undefined,
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        });
    }
}

@Injectable()
export class DeleteRecurringExpenseUseCase {
    constructor(private readonly recurringRepository: IRecurringExpenseRepository) { }

    async execute(userId: string, id: string): Promise<void> {
        const existing = await this.recurringRepository.findById(id);
        if (!existing) throw new NotFoundException('Recurring expense not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not owner');

        await this.recurringRepository.delete(id);
    }
}
