// Auto-generated Swagger Decorator
import { applyDecorators, Type } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from "@nestjs/swagger";
import { StatusCodes, getReasonPhrase } from "http-status-codes";
import { SUCCESS_MESSAGES } from "constants/messages.constants";
import { ExceptionErrorDto } from "./dtos/exception-error.dto";
import { ResponseDtoTypeEnum, ResponseDto } from "./dtos/response.dtos";

type ApiSwaggerOption = {
  status?: number;
  type?: ResponseDtoTypeEnum;
  pagination?: boolean;
};

interface ApiSwaggerFileOption {
  status?: number;
  mimeTypes: string[];
}

const getExceptionSchema = (httpStatus: number) => ({
  allOf: [
    { $ref: getSchemaPath(ExceptionErrorDto) },
    {
      properties: {
        statusCode: { example: httpStatus },
      },
    },
  ],
});

export function ApiTagsAndBearer(...tags: string[]) {
  return applyDecorators(ApiBearerAuth(), ApiTags(...tags));
}

const commonDecorators = [
  ApiExtraModels(ExceptionErrorDto),
  ApiUnauthorizedResponse({
    schema: getExceptionSchema(StatusCodes.UNAUTHORIZED),
    description: `${StatusCodes.UNAUTHORIZED}. ${getReasonPhrase(StatusCodes.UNAUTHORIZED)}`,
  }),
  ApiBadRequestResponse({
    schema: getExceptionSchema(StatusCodes.BAD_REQUEST),
    description: `${StatusCodes.BAD_REQUEST}. ${getReasonPhrase(StatusCodes.BAD_REQUEST)}`,
  }),
  ApiForbiddenResponse({
    schema: getExceptionSchema(StatusCodes.FORBIDDEN),
    description: `${StatusCodes.FORBIDDEN}. ${getReasonPhrase(StatusCodes.FORBIDDEN)}`,
  }),
  ApiNotFoundResponse({
    schema: getExceptionSchema(StatusCodes.NOT_FOUND),
    description: `${StatusCodes.NOT_FOUND}. ${getReasonPhrase(StatusCodes.NOT_FOUND)}`,
  }),
  ApiConflictResponse({
    schema: getExceptionSchema(StatusCodes.CONFLICT),
    description: `${StatusCodes.CONFLICT}. ${getReasonPhrase(StatusCodes.CONFLICT)}`,
  }),
  ApiInternalServerErrorResponse({
    schema: getExceptionSchema(StatusCodes.INTERNAL_SERVER_ERROR),
    description: `${StatusCodes.INTERNAL_SERVER_ERROR}. ${getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR)}`,
  }),
];

export function ApiSwaggerResponse<TModel extends Type>(
  model: TModel,
  options?: ApiSwaggerOption
) {
  const { status = StatusCodes.OK, type = ResponseDtoTypeEnum.Object } =
    options ?? {};

  return applyDecorators(
    ApiExtraModels(ResponseDto),
    ApiExtraModels(model),
    ApiResponse({
      status,
      schema: {
        allOf: [
          {
            $ref: getSchemaPath(ResponseDto),
          },
          {
            properties: {
              data:
                type === ResponseDtoTypeEnum.Array
                  ? {
                      type,
                      items: { $ref: getSchemaPath(model) },
                    }
                  : { $ref: getSchemaPath(model) },
              status: { example: status },
            },
          },
        ],
      },
      description:
        status === StatusCodes.CREATED
          ? SUCCESS_MESSAGES.CREATED
          : SUCCESS_MESSAGES.SUCCESS,
    }),
    ...commonDecorators
  );
}

export function ApiSwaggerFileResponse({
  mimeTypes,
  status,
}: ApiSwaggerFileOption) {
  return applyDecorators(
    ApiProduces(...mimeTypes),
    ApiOkResponse({
      schema: { type: "string", format: "binary" },
      description:
        status === StatusCodes.CREATED
          ? SUCCESS_MESSAGES.CREATED
          : SUCCESS_MESSAGES.SUCCESS,
    }),
    ...commonDecorators
  );
}
