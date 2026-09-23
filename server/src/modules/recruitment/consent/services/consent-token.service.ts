import { Injectable, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigType } from "@nestjs/config";
import jwtConfig from "config/jwt.config";
import { CONSENT_TOKEN_EXPIRY } from "../consent.constants";

export interface ConsentTokenPayload {
  matchId: string;
  contactId: number;
  jobId: string;
  connectorUserId: string;
  emailHash: string;
  iat: number;
  exp: number;
}

@Injectable()
export class ConsentTokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>
  ) {}

  async generateToken(
    matchId: string,
    contactId: number,
    jobId: string,
    connectorUserId: string,
    candidateEmailHash: string
  ): Promise<string> {
    const payload = {
      matchId,
      contactId,
      jobId,
      connectorUserId,
      emailHash: candidateEmailHash,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.jwtConfiguration.accessTokenSecret,
      expiresIn: CONSENT_TOKEN_EXPIRY,
    });
  }

  async verifyToken(token: string): Promise<ConsentTokenPayload> {
    return this.jwtService.verifyAsync<ConsentTokenPayload>(token, {
      secret: this.jwtConfiguration.accessTokenSecret,
    });
  }
}
