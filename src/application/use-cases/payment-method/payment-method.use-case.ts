import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethodRepository } from '../../../domain/repositories/payment-method.repository';
import { PaymentMethod } from '../../../domain/entities/payment-method.entity';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from '../../dtos/payment-method.dto';

@Injectable()
export class CreatePaymentMethodUseCase {
    constructor(private readonly repo: PaymentMethodRepository) { }

    async execute(userId: string, dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
        return this.repo.create(userId, dto);
    }
}

@Injectable()
export class ListPaymentMethodsUseCase {
    constructor(private readonly repo: PaymentMethodRepository) { }

    async execute(userId: string): Promise<PaymentMethod[]> {
        return this.repo.findAll(userId);
    }
}

@Injectable()
export class GetPaymentMethodUseCase {
    constructor(private readonly repo: PaymentMethodRepository) { }

    async execute(userId: string, id: string): Promise<PaymentMethod> {
        const found = await this.repo.findById(id, userId);
        if (!found) throw new NotFoundException('Payment method not found');
        return found;
    }
}

@Injectable()
export class UpdatePaymentMethodUseCase {
    constructor(private readonly repo: PaymentMethodRepository) { }

    async execute(userId: string, id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethod> {
        return this.repo.update(id, userId, dto);
    }
}

@Injectable()
export class DeletePaymentMethodUseCase {
    constructor(private readonly repo: PaymentMethodRepository) { }

    async execute(userId: string, id: string): Promise<void> {
        return this.repo.delete(id, userId);
    }
}

@Injectable()
export class SetDefaultPaymentMethodUseCase {
    constructor(private readonly repo: PaymentMethodRepository) { }

    async execute(userId: string, id: string): Promise<PaymentMethod> {
        return this.repo.setDefault(id, userId);
    }
}
