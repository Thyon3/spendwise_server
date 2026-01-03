import { Module } from '@nestjs/common';
import { ExportsController } from '../controllers/exports.controller';
import { ExportExpensesToCsvUseCase } from '../../../../application/use-cases/exports/export-expenses.use-case';
import { ExpensesModule } from './expenses.module';

@Module({
    imports: [ExpensesModule],
    controllers: [ExportsController],
    providers: [ExportExpensesToCsvUseCase],
})
export class ExportsModule { }
