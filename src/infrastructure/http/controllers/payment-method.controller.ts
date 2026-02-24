import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from '../../../application/dtos/payment-method.dto';

@Controller('payment-methods')
export class PaymentMethodController {
  @Post()
  async create(@Request() req, @Body() dto: CreatePaymentMethodDto) {
    return { message: 'Create payment method' };
  }

  @Get()
  async findAll(@Request() req) {
    return { message: 'Get all payment methods' };
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return { message: `Get payment method ${id}` };
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdatePaymentMethodDto) {
    return { message: `Update payment method ${id}` };
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return { message: `Delete payment method ${id}` };
  }

  @Post(':id/set-default')
  async setDefault(@Request() req, @Param('id') id: string) {
    return { message: `Set payment method ${id} as default` };
  }
}
