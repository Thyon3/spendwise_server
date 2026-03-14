import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ErrorLoggingFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorLoggingFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = this.buildErrorResponse(exception, request);
    
    // Log the error
    this.logError(exception, request, status);

    // Send response
    response.status(status).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request) {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const userId = (request as any).user?.userId || 'anonymous';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      const message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message;

      return {
        statusCode: exception.getStatus(),
        timestamp,
        path,
        method,
        userId,
        message,
        error: exception.constructor.name,
      };
    }

    // Handle unexpected errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      userId,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }

  private logError(exception: unknown, request: Request, status: number) {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const userId = (request as any).user?.userId || 'anonymous';

    const errorInfo = {
      method,
      url,
      status,
      userId,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      exception: exception instanceof Error ? {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      } : 'Unknown error',
    };

    if (status >= 500) {
      this.logger.error(`Server Error: ${JSON.stringify(errorInfo)}`);
    } else if (status >= 400) {
      this.logger.warn(`Client Error: ${JSON.stringify(errorInfo)}`);
    } else {
      this.logger.log(`Request Error: ${JSON.stringify(errorInfo)}`);
    }
  }
}
