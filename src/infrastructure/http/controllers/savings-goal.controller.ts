import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateSavingsGoalDto, UpdateSavingsGoalDto } from '../../../application/dtos/savings-goal.dto';
import {
  CreateSavingsGoalUseCase,
  ListSavingsGoalsUseCase,
  GetSavingsGoalUseCase,
  UpdateSavingsGoalUseCase,
  DeleteSavingsGoalUseCase,
  ContributeToSavingsGoalUseCase,
} from '../../../application/use-cases/savings-goal/savings-goal.use-case';

@ApiTags('savings-goals')
@Controller('savings-goals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavingsGoalController {
  constructor(
    private readonly createUseCase: CreateSavingsGoalUseCase,
    private readonly listUseCase: ListSavingsGoalsUseCase,
    private readonly getUseCase: GetSavingsGoalUseCase,
    private readonly updateUseCase: UpdateSavingsGoalUseCase,
    private readonly deleteUseCase: DeleteSavingsGoalUseCase,
    private readonly contributeUseCase: ContributeToSavingsGoalUseCase,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a savings goal' })
  async create(@Request() req: any, @Body() dto: CreateSavingsGoalDto) {
    return this.createUseCase.execute(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all savings goals' })
  async findAll(@Request() req: any) {
    return this.listUseCase.execute(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a savings goal by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.getUseCase.execute(req.user.userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a savings goal' })
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateSavingsGoalDto) {
    return this.updateUseCase.execute(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a savings goal' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.deleteUseCase.execute(req.user.userId, id);
  }

  @Post(':id/contribute')
  @ApiOperation({ summary: 'Add contribution to a savings goal' })
  async contribute(@Request() req: any, @Param('id') id: string, @Body() body: { amount: number }) {
    return this.contributeUseCase.execute(req.user.userId, id, body.amount);
  }
}
