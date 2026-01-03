import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GenerateRecurringExpensesUseCase } from '../../application/use-cases/expense/generate-recurring-expenses.use-case';

@Injectable()
export class ExpenseSchedulerService {
    private readonly logger = new Logger(ExpenseSchedulerService.name);

    constructor(private readonly generateRecurringExpensesUseCase: GenerateRecurringExpensesUseCase) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleRecurringExpenses() {
        this.logger.log('Running scheduled recurring expense generation...');
        await this.generateRecurringExpensesUseCase.execute();
        this.logger.log('Finished scheduled recurring expense generation.');
    }
}
