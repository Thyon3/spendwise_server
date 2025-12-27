import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateInvestmentDto, UpdateInvestmentDto } from '../../../application/dtos/investment.dto';
import {
    CreateInvestmentUseCase,
    ListInvestmentsUseCase,
    GetInvestmentUseCase,
    UpdateInvestmentUseCase,
    DeleteInvestmentUseCase,
    GetPortfolioSummaryUseCase,
} from '../../../application/use-cases/investment/investment.use-case';

@ApiTags('investments')
@Controller('investments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvestmentController {
    constructor(
        private readonly createUseCase: CreateInvestmentUseCase,
        private readonly listUseCase: ListInvestmentsUseCase,
        private readonly getUseCase: GetInvestmentUseCase,
        private readonly updateUseCase: UpdateInvestmentUseCase,
        private readonly deleteUseCase: DeleteInvestmentUseCase,
        private readonly portfolioUseCase: GetPortfolioSummaryUseCase,
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add an investment' })
    async create(@Request() req: any, @Body() dto: CreateInvestmentDto) {
        return this.createUseCase.execute(req.user.userId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all investments' })
    async findAll(@Request() req: any) {
        return this.listUseCase.execute(req.user.userId);
    }

    @Get('portfolio')
    @ApiOperation({ summary: 'Get portfolio summary' })
    async getPortfolio(@Request() req: any) {
        return this.portfolioUseCase.execute(req.user.userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get investment by ID' })
    async findOne(@Request() req: any, @Param('id') id: string) {
        return this.getUseCase.execute(req.user.userId, id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update investment price or quantity' })
    async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateInvestmentDto) {
        return this.updateUseCase.execute(req.user.userId, id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an investment' })
    async delete(@Request() req: any, @Param('id') id: string) {
        return this.deleteUseCase.execute(req.user.userId, id);
    }
}
