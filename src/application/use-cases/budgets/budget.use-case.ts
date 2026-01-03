import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IBudgetRepository } from '../../../domain/repositories/budget.repository.interface';
import { Budget, BudgetStatus } from '../../../domain/entities/budget.entity';
import { CreateBudgetDto, UpdateBudgetDto } from '../../dtos/budgets/budget.dto';

@Injectable()
export class CreateBudgetUseCase {
    constructor(private readonly budgetRepository: IBudgetRepository) { }

    async execute(userId: string, dto: CreateBudgetDto): Promise<Budget> {
        return this.budgetRepository.create({
            ...dto,
            userId,
            periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
            periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        });
    }
}

@Injectable()
export class ListBudgetsUseCase {
    constructor(private readonly budgetRepository: IBudgetRepository) { }

    async execute(userId: string): Promise<Budget[]> {
        return this.budgetRepository.findByUser(userId);
    }
}

@Injectable()
export class UpdateBudgetUseCase {
    constructor(private readonly budgetRepository: IBudgetRepository) { }

    async execute(userId: string, id: string, dto: UpdateBudgetDto): Promise<Budget> {
        const existing = await this.budgetRepository.findById(id);
        if (!existing) throw new NotFoundException('Budget not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not owner');

        return this.budgetRepository.update(id, {
            ...dto,
            periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
            periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        });
    }
}

@Injectable()
export class DeleteBudgetUseCase {
    constructor(private readonly budgetRepository: IBudgetRepository) { }

    async execute(userId: string, id: string): Promise<void> {
        const existing = await this.budgetRepository.findById(id);
        if (!existing) throw new NotFoundException('Budget not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not owner');

        await this.budgetRepository.delete(id);
    }
}

@Injectable()
export class GetBudgetStatusUseCase {
    constructor(private readonly budgetRepository: IBudgetRepository) { }

    async execute(userId: string, budgetId?: string): Promise<BudgetStatus | BudgetStatus[]> {
        const currentDate = new Date();

        if (budgetId) {
            const budget = await this.budgetRepository.findById(budgetId);
            if (!budget) throw new NotFoundException('Budget not found');
            if (budget.userId !== userId) throw new ForbiddenException('Not owner');

            return this.budgetRepository.getBudgetStatus(budgetId, currentDate);
        } else {
            return this.budgetRepository.getAllBudgetStatuses(userId, currentDate);
        }
    }
}
