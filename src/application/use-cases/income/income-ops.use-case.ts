import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IIncomeRepository, IncomeFilters } from '../../../domain/repositories/income.repository.interface';
import { Income } from '../../../domain/entities/income.entity';
import { CreateIncomeDto, UpdateIncomeDto, IncomeFiltersDto } from '../../dtos/income/income.dto';

@Injectable()
export class CreateIncomeUseCase {
    constructor(private readonly incomeRepository: IIncomeRepository) { }

    async execute(userId: string, dto: CreateIncomeDto): Promise<Income> {
        return this.incomeRepository.create({
            ...dto,
            userId,
            date: new Date(dto.date),
        });
    }
}

@Injectable()
export class ListIncomesForUserUseCase {
    constructor(private readonly incomeRepository: IIncomeRepository) { }

    async execute(userId: string, filtersDto: IncomeFiltersDto): Promise<Income[]> {
        const filters: IncomeFilters = {
            ...filtersDto,
            from: filtersDto.from ? new Date(filtersDto.from) : undefined,
            to: filtersDto.to ? new Date(filtersDto.to) : undefined,
        };
        return this.incomeRepository.findByUser(userId, filters);
    }
}

@Injectable()
export class UpdateIncomeUseCase {
    constructor(private readonly incomeRepository: IIncomeRepository) { }

    async execute(userId: string, id: string, dto: UpdateIncomeDto): Promise<Income> {
        const existing = await this.incomeRepository.findById(id);
        if (!existing) throw new NotFoundException('Income not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not owner');

        return this.incomeRepository.update(id, {
            ...dto,
            date: dto.date ? new Date(dto.date) : undefined,
        });
    }
}

@Injectable()
export class DeleteIncomeUseCase {
    constructor(private readonly incomeRepository: IIncomeRepository) { }

    async execute(userId: string, id: string): Promise<void> {
        const existing = await this.incomeRepository.findById(id);
        if (!existing) throw new NotFoundException('Income not found');
        if (existing.userId !== userId) throw new ForbiddenException('Not owner');

        await this.incomeRepository.delete(id);
    }
}
