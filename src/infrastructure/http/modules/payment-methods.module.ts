import { Module } from '@nestjs/common';
import { PaymentMethodController } from '../controllers/payment-method.controller';
import {
    CreatePaymentMethodUseCase,
    ListPaymentMethodsUseCase,
    GetPaymentMethodUseCase,
    UpdatePaymentMethodUseCase,
    DeletePaymentMethodUseCase,
    SetDefaultPaymentMethodUseCase,
} from '../../../application/use-cases/payment-method/payment-method.use-case';
import { PaymentMethodRepository } from '../../../../domain/repositories/payment-method.repository';
import { PrismaPaymentMethodRepository } from '../../persistence/prisma/prisma-payment-method.repository';

@Module({
    controllers: [PaymentMethodController],
    providers: [
        CreatePaymentMethodUseCase,
        ListPaymentMethodsUseCase,
        GetPaymentMethodUseCase,
        UpdatePaymentMethodUseCase,
        DeletePaymentMethodUseCase,
        SetDefaultPaymentMethodUseCase,
        {
            provide: PaymentMethodRepository,
            useClass: PrismaPaymentMethodRepository,
        },
    ],
    exports: [PaymentMethodRepository],
})
export class PaymentMethodsModule { }
