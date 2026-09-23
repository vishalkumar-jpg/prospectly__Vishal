import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { captureException } from "@sentry/node";
import { toUTC } from "utils/dayjs";

function extractHttpExceptionMessage(
  exception: HttpException
): string | string[] {
  const exceptionResponse = exception.getResponse();

  if (typeof exceptionResponse !== "object" || exceptionResponse === null) {
    return exception.message;
  }

  const responseObj = exceptionResponse as {
    message?: string | string[];
  };

  if (Array.isArray(responseObj.message)) {
    return responseObj.message;
  }

  if (responseObj.message) {
    return responseObj.message;
  }

  return exception.message;
}

function extractHttpExceptionCode(
  exception: HttpException
): string | undefined {
  const exceptionResponse = exception.getResponse();

  if (typeof exceptionResponse !== "object" || exceptionResponse === null) {
    return undefined;
  }

  const responseObj = exceptionResponse as { code?: string };

  return typeof responseObj.code === "string" ? responseObj.code : undefined;
}

function normalizeExceptionMessage(
  message: string | string[],
  isProduction: boolean,
  status: number
): string | string[] {
  if (
    typeof message === "object" &&
    message !== null &&
    !Array.isArray(message)
  ) {
    return String(message);
  }

  if (isProduction && status === HttpStatus.INTERNAL_SERVER_ERROR) {
    return "An unexpected error occurred. Please try again later.";
  }

  return message;
}

function logExceptionForRequest(
  logger: Logger,
  request: Request,
  status: number,
  message: string | string[],
  exception: unknown
): void {
  if (status === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
    logger.warn(
      `AllExceptionsFilter :: catch : VALIDATION : ${request.method} ${request.url} : ${message.join(", ")}`
    );
    return;
  }

  logger.error(
    `AllExceptionsFilter :: catch : ERROR : ${request.method} ${request.url}`,
    exception instanceof Error ? exception.stack : exception
  );

  if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
    captureException(exception, {
      extra: {
        statusCode: status,
        message,
        stack: exception instanceof Error ? exception.stack : undefined,
      },
    });
  }
}

function resolveExceptionMessage(exception: unknown): string | string[] {
  if (exception instanceof HttpException) {
    return extractHttpExceptionMessage(exception);
  }

  return exception instanceof Error
    ? exception.message
    : "Internal server error";
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProduction = process.env.NODE_ENV === "production";

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = normalizeExceptionMessage(
      resolveExceptionMessage(exception),
      this.isProduction,
      status
    );

    logExceptionForRequest(this.logger, request, status, message, exception);

    const code =
      exception instanceof HttpException
        ? extractHttpExceptionCode(exception)
        : undefined;

    response.status(status).json({
      statusCode: status,
      timestamp: toUTC().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(code ? { code } : {}),
    });
  }
}
