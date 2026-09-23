import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { appConfig } from "config/app.config";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { users } from "database/schema/users";
import { eq } from "drizzle-orm";
import { AUTH_MESSAGES } from "modules/auth/auth.constants";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {
    const secret =
      configService?.get<string>("jwt.accessTokenSecret") ||
      configService?.get<string>("JWT_SECRET");
    if (!secret) {
      throw new Error(
        "JWT_SECRET must be configured. Set JWT_SECRET environment variable."
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.[appConfig.cookieNames.accessToken];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: "prospectly",
    });
  }

  async validate(payload: AnyType) {
    if (payload.tokenType !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }

    const [row] = await this.db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!row) {
      throw new UnauthorizedException(AUTH_MESSAGES.ERROR.USER_NOT_FOUND);
    }

    if (row.isActive !== true) {
      throw new UnauthorizedException(
        AUTH_MESSAGES.ERROR.USER_ACCOUNT_INACTIVE
      );
    }

    return {
      userId: payload.userId,
      email: payload.email,
      tokenType: payload.tokenType,
    };
  }
}
