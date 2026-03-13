import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TWO_FACTOR_AUTH_KEY } from '../decorators/two-factor.decorator';

@Injectable()
export class TwoFactorGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isTwoFactorRequired = this.reflector.get<boolean>(
      TWO_FACTOR_AUTH_KEY,
      context.getHandler(),
    );

    if (!isTwoFactorRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user.twoFactorEnabled) {
      throw new ForbiddenException('Two-factor authentication is required for this action');
    }

    return true;
  }
}
