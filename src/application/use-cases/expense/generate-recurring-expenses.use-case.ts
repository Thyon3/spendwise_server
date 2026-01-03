import { Injectable, Logger } from '@nestjs/common';
import { IRecurringExpenseRepository } from '../../../domain/repositories/recurring-expense.repository.interface';
import { IExpenseRepository } from '../../../domain/repositories/expense.repository.interface';
import { RecurrenceType } from '../../../domain/entities/recurring-expense.entity';

@Injectable()
export class GenerateRecurringExpensesUseCase {
    private readonly logger = new Logger(GenerateRecurringExpensesUseCase.name);

    constructor(
        private readonly recurringRepository: IRecurringExpenseRepository,
        private readonly expenseRepository: IExpenseRepository,
    ) { }

    async execute(targetDate: Date = new Date()): Promise<void> {
        const rules = await this.recurringRepository.findActiveForGeneration(targetDate);
        this.logger.log(`Found ${rules.length} active recurring rules to process`);

        for (const rule of rules) {
            try {
                await this._processRule(rule, targetDate);
            } catch (error) {
                this.logger.error(`Error processing recurring expense ${rule.id}: ${error.message}`);
            }
        }
    }

    private async _processRule(rule: any, targetDate: Date) {
        let nextDate = this._calculateNextDate(rule);

        while (nextDate <= targetDate) {
            // Check if instance already exists (simplified: using lastGenerated or a range check)
            // For this phase, we use the simple rule that we create one for 'nextDate' 
            // and update the rule's lastGenerated.

            await this.expenseRepository.create({
                amount: rule.amount,
                currency: rule.currency,
                description: rule.description,
                date: nextDate,
                userId: rule.userId,
                categoryId: rule.categoryId,
                recurringExpenseId: rule.id,
            });

            rule.lastGenerated = nextDate;
            await this.recurringRepository.update(rule.id, { lastGeneratedDate: nextDate });

            if (rule.endDate && nextDate >= rule.endDate) break;

            nextDate = this._calculateNextDate(rule);
        }
    }

    private _calculateNextDate(rule: any): Date {
        const baseDate = rule.lastGenerated || new Date(rule.startDate.getTime() - 1);
        const date = new Date(baseDate);

        switch (rule.recurrenceType) {
            case RecurrenceType.DAILY:
                date.setDate(date.getDate() + rule.interval);
                break;
            case RecurrenceType.WEEKLY:
                date.setDate(date.getDate() + (7 * rule.interval));
                break;
            case RecurrenceType.MONTHLY:
                date.setMonth(date.getMonth() + rule.interval);
                break;
            case RecurrenceType.YEARLY:
                date.setFullYear(date.getFullYear() + rule.interval);
                break;
        }
        return date;
    }
}
