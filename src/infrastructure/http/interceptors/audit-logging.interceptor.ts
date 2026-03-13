import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'];
    const userId = request.user?.sub || 'anonymous';
    
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] ${method} ${url} - User: ${userId} - IP: ${ip} - UA: ${userAgent}`);
    
    return next.handle().pipe(
      tap(() => {
        console.log(`[${timestamp}] ${method} ${url} - SUCCESS`);
      }),
    );
  }
}
