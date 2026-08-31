import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiErrorCode,
  ApiErrorResponse,
  FieldError,
} from '@ingredia/contracts';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { ContractValidationException } from './contract-validation.pipe';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter<object> {
  catch(exception: object, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = this.requestId(request);
    const body: ApiErrorResponse = {
      code: this.errorCode(status),
      message: this.safeMessage(exception, status),
      requestId,
      fieldErrors: this.fieldErrors(exception),
    };

    response.setHeader('x-request-id', requestId);
    response.status(status).json(body);
  }

  private requestId(request: Request): string {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' && value.length <= 128
      ? value
      : randomUUID();
  }

  private fieldErrors(exception: object): FieldError[] {
    return exception instanceof ContractValidationException
      ? exception.fieldErrors
      : [];
  }

  private safeMessage(exception: object, status: number): string {
    if (status >= 500) return 'An internal service error occurred.';
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') return response;
      if ('message' in response && typeof response.message === 'string') {
        return response.message;
      }
    }
    return 'The request could not be completed.';
  }

  private errorCode(status: number): ApiErrorCode {
    if (status === HttpStatus.BAD_REQUEST) return ApiErrorCode.VALIDATION_ERROR;
    if (status === HttpStatus.UNAUTHORIZED) return ApiErrorCode.UNAUTHENTICATED;
    if (status === HttpStatus.FORBIDDEN) return ApiErrorCode.FORBIDDEN;
    if (status === HttpStatus.NOT_FOUND) return ApiErrorCode.NOT_FOUND;
    if (status === HttpStatus.CONFLICT) return ApiErrorCode.CONFLICT;
    if (status === HttpStatus.TOO_MANY_REQUESTS) return ApiErrorCode.RATE_LIMITED;
    if (status === HttpStatus.SERVICE_UNAVAILABLE) {
      return ApiErrorCode.SERVICE_UNAVAILABLE;
    }
    return ApiErrorCode.INTERNAL_ERROR;
  }
}

