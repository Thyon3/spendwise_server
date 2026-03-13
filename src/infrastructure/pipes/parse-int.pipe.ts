import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string> {
  constructor(private readonly options?: { min?: number; max?: number }) {}

  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);

    if (isNaN(val)) {
      throw new BadRequestException('Validation failed (numeric string is expected)');
    }

    if (this.options?.min !== undefined && val < this.options.min) {
      throw new BadRequestException(`Value must be at least ${this.options.min}`);
    }

    if (this.options?.max !== undefined && val > this.options.max) {
      throw new BadRequestException(`Value must be at most ${this.options.max}`);
    }

    return val;
  }
}
