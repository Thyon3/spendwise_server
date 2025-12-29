import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from '../../../application/dtos/payment-method.dto';
import {
  CreatePaymentMethodUseCase,
  ListPaymentMethodsUseCase,
  GetPaymentMethodUseCase,
  UpdatePaymentMethodUseCase,
  DeletePaymentMethodUseCase,
  SetDefaultPaymentMethodUseCase,
} from '../../../application/use-cases/payment-method/payment-method.use-case';

@ApiTags('payment-methods')
@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentMethodController {
  constructor(
    private readonly createUseCase: CreatePaymentMethodUseCase,
    private readonly listUseCase: ListPaymentMethodsUseCase,
    private readonly getUseCase: GetPaymentMethodUseCase,
    private readonly updateUseCase: UpdatePaymentMethodUseCase,
    private readonly deleteUseCase: DeletePaymentMethodUseCase,
    private readonly setDefaultUseCase: SetDefaultPaymentMethodUseCase,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a payment method' })
  async create(@Request() req: any, @Body() dto: CreatePaymentMethodDto) {
    return this.createUseCase.execute(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all payment methods' })
  async findAll(@Request() req: any) {
    return this.listUseCase.execute(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment method by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.getUseCase.execute(req.user.userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a payment method' })
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePaymentMethodDto) {
    return this.updateUseCase.execute(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a payment method' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.deleteUseCase.execute(req.user.userId, id);
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set a payment method as default' })
  async setDefault(@Request() req: any, @Param('id') id: string) {
    return this.setDefaultUseCase.execute(req.user.userId, id);
  }
}
