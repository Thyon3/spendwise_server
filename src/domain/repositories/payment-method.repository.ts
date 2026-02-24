import { PaymentMethod } from '../entities/payment-method.entity';

export interface PaymentMethodRepository {
  create(userId: string, data: Partial<PaymentMethod>): Promise<PaymentMethod>;
  findById(id: string, userId: string): Promise<PaymentMethod | null>;
  findAll(userId: string): Promise<PaymentMethod[]>;
  update(id: string, userId: string, data: Partial<PaymentMethod>): Promise<PaymentMethod>;
  delete(id: string, userId: string): Promise<void>;
  setDefault(id: string, userId: string): Promise<PaymentMethod>;
}
