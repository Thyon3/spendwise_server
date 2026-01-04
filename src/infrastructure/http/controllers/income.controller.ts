import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CreateIncomeUseCase, ListIncomesForUserUseCase, UpdateIncomeUseCase, DeleteIncomeUseCase } from '../../../application/use-cases/income/income-ops.use-case';
import { CreateIncomeDto, UpdateIncomeDto, IncomeFiltersDto } from '../../../application/dtos/income/income.dto';

@Controller('incomes')
@UseGuards(JwtAuthGuard)
export class IncomeController {
    constructor(
        private readonly createUseCase: CreateIncomeUseCase,
        private readonly listUseCase: ListIncomesForUserUseCase,
        private readonly updateUseCase: UpdateIncomeUseCase,
        private readonly deleteUseCase: DeleteIncomeUseCase,
    ) { }

    @Post()
    create(@Request() req, @Body() dto: CreateIncomeDto) {
        return this.createUseCase.execute(req.user.id, dto);
    }

    @Get()
    findAll(@Request() req, @Query() filters: IncomeFiltersDto) {
        return this.listUseCase.execute(req.user.id, filters);
    }

    @Put(':id')
    update(@Request() req, @Param('id') id: string, @Body() dto: UpdateIncomeDto) {
        return this.updateUseCase.execute(req.user.id, id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    delete(@Request() req, @Param('id') id: string) {
        return this.deleteUseCase.execute(req.user.id, id);
    }
}
