import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaInvestmentRepository } from '../../../infrastructure/persistence/prisma/prisma-investment.repository';
import { Investment } from '../../../domain/entities/investment.entity';
import { CreateInvestmentDto, UpdateInvestmentDto } from '../../dtos/investment.dto';

@Injectable()
export class CreateInvestmentUseCase {
    constructor(private readonly repo: PrismaInvestmentRepository) { }
    async execute(userId: string, dto: CreateInvestmentDto): Promise<Investment> {
        return this.repo.create(userId, dto);
    }
}

@Injectable()
export class ListInvestmentsUseCase {
    constructor(private readonly repo: PrismaInvestmentRepository) { }
    async execute(userId: string): Promise<Investment[]> {
        return this.repo.findAll(userId);
    }
}

@Injectable()
export class GetInvestmentUseCase {
    constructor(private readonly repo: PrismaInvestmentRepository) { }
    async execute(userId: string, id: string): Promise<Investment> {
        const found = await this.repo.findById(id, userId);
        if (!found) throw new NotFoundException('Investment not found');
        return found;
    }
}

@Injectable()
export class UpdateInvestmentUseCase {
    constructor(private readonly repo: PrismaInvestmentRepository) { }
    async execute(userId: string, id: string, dto: UpdateInvestmentDto): Promise<Investment> {
        return this.repo.update(id, userId, dto);
    }
}

@Injectable()
export class DeleteInvestmentUseCase {
    constructor(private readonly repo: PrismaInvestmentRepository) { }
    async execute(userId: string, id: string): Promise<void> {
        return this.repo.delete(id, userId);
    }
}

@Injectable()
export class GetPortfolioSummaryUseCase {
    constructor(private readonly repo: PrismaInvestmentRepository) { }
    async execute(userId: string) {
        return this.repo.getPortfolioSummary(userId);
    }
}
