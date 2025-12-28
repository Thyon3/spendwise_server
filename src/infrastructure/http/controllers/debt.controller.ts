import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateDebtDto, UpdateDebtDto, CreateDebtPaymentDto } from '../../../application/dtos/debt.dto';
import {
    CreateDebtUseCase,
    ListDebtsUseCase,
    GetDebtUseCase,
    UpdateDebtUseCase,
    DeleteDebtUseCase,
    AddDebtPaymentUseCase,
    GetDebtSummaryUseCase,
} from '../../../application/use-cases/debt/debt.use-case';

@ApiTags('debts')
@Controller('debts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DebtController {
    constructor(
        private readonly createUseCase: CreateDebtUseCase,
        private readonly listUseCase: ListDebtsUseCase,
        private readonly getUseCase: GetDebtUseCase,
        private readonly updateUseCase: UpdateDebtUseCase,
        private readonly deleteUseCase: DeleteDebtUseCase,
        private readonly addPaymentUseCase: AddDebtPaymentUseCase,
        private readonly summaryUseCase: GetDebtSummaryUseCase,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a debt record' })
    async create(@Request() req: any, @Body() dto: CreateDebtDto) {
        return this.createUseCase.execute(req.user.userId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all debts' })
    async findAll(@Request() req: any) {
        return this.listUseCase.execute(req.user.userId);
    }

    @Get('summary')
    @ApiOperation({ summary: 'Get debt summary stats' })
    async getSummary(@Request() req: any) {
        return this.summaryUseCase.execute(req.user.userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a debt by ID' })
    async findOne(@Request() req: any, @Param('id') id: string) {
        return this.getUseCase.execute(req.user.userId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a debt' })
    async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateDebtDto) {
        return this.updateUseCase.execute(req.user.userId, id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a debt' })
    async delete(@Request() req: any, @Param('id') id: string) {
        return this.deleteUseCase.execute(req.user.userId, id);
    }

    @Post(':id/payments')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Log a debt payment' })
    async addPayment(@Request() req: any, @Param('id') id: string, @Body() dto: CreateDebtPaymentDto) {
        return this.addPaymentUseCase.execute(req.user.userId, id, { ...dto, debtId: id });
    }
}
