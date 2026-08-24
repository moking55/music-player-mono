import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { MulterError } from 'multer';

import type {
  ErrorOptions,
  JsonApiError,
  ValidationItem,
} from '@/common/interfaces/exception-filter';

import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = this.getStatusCode(exception);
    const errorObj = this.buildErrorObject(exception, status, request.url);

    this.logError(exception, errorObj);

    const responseBody = {
      status: {
        code: status,
        message: this.getStatusMessage(status),
      },
      errors: [errorObj],
    };

    response.status(status).json(responseBody);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof MulterError) {
      return exception.code === 'LIMIT_FILE_SIZE'
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : HttpStatus.BAD_REQUEST;
    }
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getStatusMessage(status: number): string {
    const statusMessages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      422: 'Unprocessable Entity',
      413: 'Payload Too Large',
      500: 'Internal Server Error',
    };
    return statusMessages[status] || 'Error';
  }

  private buildErrorObject(
    exception: unknown,
    status: number,
    requestUrl: string,
  ): JsonApiError {
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, status, requestUrl);
    }

    if (exception instanceof Error) {
      return this.handleGenericError(exception, status);
    }

    return this.handleUnknownError(status);
  }

  private handleHttpException(
    exception: HttpException,
    status: number,
    requestUrl: string,
  ): JsonApiError {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return this.createError({
        status,
        code: 'HTTP_EXCEPTION',
        detail: response,
      });
    }

    if (response && typeof response === 'object') {
      return this.handleObjectResponse(response, status, requestUrl, exception);
    }

    return this.createError({
      status,
      code: exception instanceof Error ? exception.name : 'ERROR',
      detail:
        exception instanceof Error ? exception.message : String(exception),
    });
  }

  private handleObjectResponse(
    response: any,
    status: number,
    requestUrl: string,
    exception: HttpException,
  ): JsonApiError {
    // Handle validation errors from class-validator
    if (Array.isArray(response.message) && response.message.length > 0) {
      return this.handleValidationMessages(
        response.message,
        response.error,
        status,
      );
    }

    // Handle pre-formatted errors
    if (Array.isArray(response.errors) && response.errors.length > 0) {
      return this.handlePreformattedErrors(
        response.errors,
        response.error,
        status,
      );
    }

    // Handle generic object response
    return this.handleGenericObjectResponse(response, status, exception);
  }

  private handleValidationMessages(
    messages: any[],
    errorTitle: string,
    status: number,
  ): JsonApiError {
    if (typeof messages[0] === 'object' && messages[0].property) {
      return this.handleValidationItems(messages as ValidationItem[], status);
    }

    // Array of strings
    const detail = messages.map((m) => String(m)).join('; ');
    return this.createError({
      status,
      code: 'VALIDATION_ERROR',
      detail,
    });
  }

  private handleValidationItems(
    items: ValidationItem[],
    status: number,
  ): JsonApiError {
    const parts: string[] = [];
    const properties: string[] = [];

    for (const item of items) {
      const constraints = this.extractConstraints(item);
      parts.push(constraints);
      if (item.property) {
        properties.push(item.property);
      }
    }

    return this.createError({
      status,
      code: 'INVALID_INPUT',
      detail: parts.join('; '),
      field: properties[0] || undefined,
    });
  }

  private extractConstraints(item: ValidationItem): string {
    if (item.constraints) {
      return Object.values(item.constraints).join(', ');
    }
    if (Array.isArray(item.messages)) {
      return item.messages.join(', ');
    }
    return String(item);
  }

  private handlePreformattedErrors(
    errors: any[],
    errorTitle: string,
    status: number,
  ): JsonApiError {
    const details = errors
      .map((e) => e.detail ?? e.message ?? JSON.stringify(e))
      .join('; ');

    return this.createError({
      status,
      code: 'MULTIPLE_ERRORS',
      detail: details,
    });
  }

  private handleGenericObjectResponse(
    response: any,
    status: number,
    exception: HttpException,
  ): JsonApiError {
    let detail = '';

    if (Array.isArray(response.message)) {
      detail = response.message.join(', ');
    } else if (response.message) {
      detail = String(response.message);
    } else if (exception.message) {
      detail = exception.message;
    } else {
      detail = 'Error';
    }

    return this.createError({
      status,
      code: response.error || 'GENERAL_ERROR',
      detail,
    });
  }

  private handleGenericError(exception: Error, status: number): JsonApiError {
    return this.createError({
      status,
      code: exception.name || 'ERROR',
      detail: exception.message,
    });
  }

  private handleUnknownError(status: number): JsonApiError {
    return this.createError({
      status,
      code: 'UNKNOWN_ERROR',
      detail: 'Unexpected error',
    });
  }

  private createError(opts: ErrorOptions): JsonApiError {
    const error: JsonApiError = {
      code: opts.code || 'GENERAL_ERROR',
      message: opts.detail || opts.title || 'An error occurred',
    };

    if (opts.field) {
      error.field = opts.field;
    }

    return error;
  }

  private getDefaultTitle(status: number | string): string {
    return Number(status) >= 500 ? 'Internal Server Error' : 'Error';
  }

  private shouldIncludeStack(): boolean {
    return process.env.NODE_ENV !== 'production';
  }

  private logError(exception: unknown, errorObj: JsonApiError): void {
    if (exception instanceof Error) {
      this.logger.error(errorObj.message, exception.stack);
    } else {
      this.logger.error(JSON.stringify(errorObj));
    }
  }
}
