import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AUDIT_LOG_KEY } from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMetadata = this.reflector.get(AUDIT_LOG_KEY, context.getHandler());
    
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { user, body, params } = request;

    return next.handle().pipe(
      tap(() => {
        // Log the action
        console.log('Audit:', {
          userId: user?.id,
          action: auditMetadata.action,
          entityType: auditMetadata.entityType,
          entityId: params?.id
        });
      })
    );
  }
}
