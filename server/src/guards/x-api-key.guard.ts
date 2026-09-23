import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import * as crypto from "node:crypto";

@Injectable()
export class XApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers["x-api-key"] as string;
    const expectedApiKey = this.configService.get<string>("X_API_KEY");

    if (!expectedApiKey) {
      throw new InternalServerErrorException("X_API_KEY is not configured");
    }

    if (!apiKey) {
      throw new UnauthorizedException("Invalid or missing X-API-Key");
    }

    const apiKeyBuffer = Buffer.from(apiKey);
    const expectedApiKeyBuffer = Buffer.from(expectedApiKey);

    if (
      apiKeyBuffer.length !== expectedApiKeyBuffer.length ||
      !crypto.timingSafeEqual(apiKeyBuffer, expectedApiKeyBuffer)
    ) {
      throw new UnauthorizedException("Invalid or missing X-API-Key");
    }

    return true;
  }
}
