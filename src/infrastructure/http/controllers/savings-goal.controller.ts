import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CreateSavingsGoalDto, UpdateSavingsGoalDto } from '../../../application/dtos/savings-goal.dto';

@Controller('savings-goals')
export class SavingsGoalController {
  @Post()
  async create(@Request() req, @Body() dto: CreateSavingsGoalDto) {
    // Implementation will be added
    return { message: 'Create savings goal' };
  }

  @Get()
  async findAll(@Request() req) {
    return { message: 'Get all savings goals' };
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return { message: `Get savings goal ${id}` };
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSavingsGoalDto) {
    return { message: `Update savings goal ${id}` };
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return { message: `Delete savings goal ${id}` };
  }

  @Post(':id/contribute')
  async contribute(@Request() req, @Param('id') id: string, @Body() body: { amount: number }) {
    return { message: `Contribute to savings goal ${id}` };
  }
}
