import { Injectable, NotFoundException } from '@nestjs/common';
import { SavingsGoalRepository } from '../../../domain/repositories/savings-goal.repository';
import { SavingsGoal } from '../../../domain/entities/savings-goal.entity';
import { CreateSavingsGoalDto, UpdateSavingsGoalDto } from '../../dtos/savings-goal.dto';

@Injectable()
export class CreateSavingsGoalUseCase {
    constructor(private readonly repo: SavingsGoalRepository) { }

    async execute(userId: string, dto: CreateSavingsGoalDto): Promise<SavingsGoal> {
        return this.repo.create(userId, {
            ...dto,
            deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        });
    }
}

@Injectable()
export class ListSavingsGoalsUseCase {
    constructor(private readonly repo: SavingsGoalRepository) { }

    async execute(userId: string): Promise<SavingsGoal[]> {
        return this.repo.findAll(userId);
    }
}

@Injectable()
export class GetSavingsGoalUseCase {
    constructor(private readonly repo: SavingsGoalRepository) { }

    async execute(userId: string, id: string): Promise<SavingsGoal> {
        const found = await this.repo.findById(id, userId);
        if (!found) throw new NotFoundException('Savings goal not found');
        return found;
    }
}

@Injectable()
export class UpdateSavingsGoalUseCase {
    constructor(private readonly repo: SavingsGoalRepository) { }

    async execute(userId: string, id: string, dto: UpdateSavingsGoalDto): Promise<SavingsGoal> {
        return this.repo.update(id, userId, {
            ...dto,
            deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        });
    }
}

@Injectable()
export class DeleteSavingsGoalUseCase {
    constructor(private readonly repo: SavingsGoalRepository) { }

    async execute(userId: string, id: string): Promise<void> {
        return this.repo.delete(id, userId);
    }
}

@Injectable()
export class ContributeToSavingsGoalUseCase {
    constructor(private readonly repo: SavingsGoalRepository) { }

    async execute(userId: string, id: string, amount: number): Promise<SavingsGoal> {
        return this.repo.updateProgress(id, userId, amount);
    }
}
