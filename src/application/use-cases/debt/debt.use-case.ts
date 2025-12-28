import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaDebtRepository } from '../../../infrastructure/persistence/prisma/prisma-debt.repository';
import { Debt, DebtPayment } from '../../../domain/entities/debt.entity';
import { CreateDebtDto, UpdateDebtDto, CreateDebtPaymentDto } from '../../dtos/debt.dto';

@Injectable()
export class CreateDebtUseCase {
    constructor(private readonly repo: PrismaDebtRepository) { }
    async execute(userId: string, dto: CreateDebtDto): Promise<Debt> {
        return this.repo.create(userId, dto);
    }
}

@Injectable()
export class ListDebtsUseCase {
    constructor(private readonly repo: PrismaDebtRepository) { }
    async execute(userId: string): Promise<Debt[]> {
        return this.repo.findAll(userId);
    }
}

@Injectable()
export class GetDebtUseCase {
    constructor(private readonly repo: PrismaDebtRepository) { }
    async execute(userId: string, id: string): Promise<Debt> {
        const found = await this.repo.findById(id, userId);
        if (!found) throw new NotFoundException('Debt not found');
        return found;
    }
}

@Injectable()
export class UpdateDebtUseCase {
    constructor(private readonly repo: PrismaDebtRepository) { }
    async execute(userId: string, id: string, dto: UpdateDebtDto): Promise<Debt> {
        return this.repo.update(id, userId, dto);
    }
}

@Injectable()
export class DeleteDebtUseCase {
    constructor(private readonly repo: PrismaDebtRepository) { }
    async execute(userId: string, id: string): Promise<void> {
        return this.repo.delete(id, userId);
    }
}

@Injectable()
export class AddDebtPaymentUseCase {
    constructor(private readonly repo: PrismaDebtRepository) { }
    async execute(userId: string, debtId: string, dto: CreateDebtPaymentDto): Promise<DebtPayment> {
        return this.repo.addPayment(debtId, userId, {
            ...dto,
            paymentDate: new Date(dto.paymentDate),
        });
    }
}

@Injectable()
export class GetDebtSummaryUseCase {
    constructor(private readonly repo: PrismaDebtRepository) { }
    async execute(userId: string) {
        return this.repo.getSummary(userId);
    }
}
