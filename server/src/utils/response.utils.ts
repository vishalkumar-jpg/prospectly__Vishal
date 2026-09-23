import { StatusCodes } from "http-status-codes";
import { HttpException, HttpStatus } from "@nestjs/common";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { Response } from "express";
import { captureException } from "@sentry/node";

export interface CommonResponseType<T> {
  data: T;
  status?: number;
  dto?: ClassConstructor<T>;
}

interface ErrorResponseType {
  res: Response;
  error: Error | HttpException;
  additionalErrors?: Array<{
    warnings: string[];
    errors: string[];
    slotIndex: number;
  }>;
  statusCode?: StatusCodes;
}

interface ErrorResponseFormat {
  statusCode: number;
  message: string;
  errors?: Array<{
    warnings: string[];
    errors: string[];
    slotIndex: number;
  }>;
}

class ResponseUtils {
  public success<T>(
    resp: Response,
    { data, dto, status = StatusCodes.OK }: CommonResponseType<T>
  ): Response<CommonResponseType<T>> {
    if (dto) {
      data = plainToInstance(dto, data, {
        excludeExtraneousValues: true,
      });
    }

    return resp.status(status).send({ data, status });
  }

  public error({
    res,
    error,
    statusCode,
    additionalErrors,
  }: ErrorResponseType) {
    const errorStatus =
      statusCode ??
      (error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.BAD_REQUEST);

    const errorResponse: ErrorResponseFormat = {
      statusCode: errorStatus,
      message: error.message,
    };

    if (additionalErrors && additionalErrors.length > 0) {
      errorResponse.errors = additionalErrors;
    }

    // Report internal server errors to Sentry
    if (errorStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
      captureException(error, {
        extra: {
          statusCode: errorStatus,
          message: error.message,
          additionalErrors,
        },
      });
    }

    return res.status(errorStatus).send(errorResponse);
  }
}

export default new ResponseUtils();
