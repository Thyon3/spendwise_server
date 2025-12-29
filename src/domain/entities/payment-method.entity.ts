export class PaymentMethod {
  id: string;
  userId: string;
  name: string;
  type: string;
  lastFourDigits?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<PaymentMethod>) {
    Object.assign(this, data);
  }
}
