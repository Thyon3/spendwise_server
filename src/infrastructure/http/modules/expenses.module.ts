import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ExpensesController } from '../controllers/expenses.controller';
import { RecurringExpensesController } from '../controllers/recurring-expenses.controller';
import { TagsController } from '../controllers/tags.controller';
import { CreateExpenseUseCase, ListExpensesForUserUseCase, UpdateExpenseUseCase, DeleteExpenseUseCase } from '../../../../application/use-cases/expense/expense-ops.use-case';
import { GetExpenseSummaryUseCase } from '../../../../application/use-cases/expense/get-expense-summary.use-case';
import { CreateRecurringExpenseUseCase, ListRecurringExpensesUseCase, UpdateRecurringExpenseUseCase, DeleteRecurringExpenseUseCase } from '../../../../application/use-cases/expense/recurring-expense-ops.use-case';
import { GenerateRecurringExpensesUseCase } from '../../../../application/use-cases/expense/generate-recurring-expenses.use-case';
import { CreateTagUseCase, ListTagsUseCase, DeleteTagUseCase } from '../../../../application/use-cases/expense/tag-ops.use-case';
import { IExpenseRepository } from '../../../../domain/repositories/expense.repository.interface';
import { IRecurringExpenseRepository } from '../../../../domain/repositories/recurring-expense.repository.interface';
import { ITagRepository } from '../../../../domain/repositories/tag.repository.interface';
import { PrismaExpenseRepository } from '../../persistence/prisma/prisma-expense.repository';
import { PrismaRecurringExpenseRepository } from '../../persistence/prisma/prisma-recurring-expense.repository';
import { PrismaTagRepository } from '../../persistence/prisma/prisma-tag.repository';
import { ExpenseSchedulerService } from '../../../services/expense-scheduler.service';

@Module({
    imports: [
        ScheduleModule.forRoot(),
    ],
    controllers: [ExpensesController, RecurringExpensesController, TagsController],
    providers: [
        CreateExpenseUseCase,
        ListExpensesForUserUseCase,
        UpdateExpenseUseCase,
        DeleteExpenseUseCase,
        GetExpenseSummaryUseCase,
        CreateRecurringExpenseUseCase,
        ListRecurringExpensesUseCase,
        UpdateRecurringExpenseUseCase,
        DeleteRecurringExpenseUseCase,
        GenerateRecurringExpensesUseCase,
        CreateTagUseCase,
        ListTagsUseCase,
        DeleteTagUseCase,
        ExpenseSchedulerService,
        {
            provide: IExpenseRepository,
            useClass: PrismaExpenseRepository,
        },
        {
            provide: IRecurringExpenseRepository,
            useClass: PrismaRecurringExpenseRepository,
        },
        {
            provide: ITagRepository,
            useClass: PrismaTagRepository,
        },
    ],
    exports: [IExpenseRepository, IRecurringExpenseRepository, ITagRepository],
})
export class ExpensesModule { }
