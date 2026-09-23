import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_IGNORE_JWT_KEY = "isPublicIgnoreJwt";
export const PublicIgnoreJwt = () =>
  SetMetadata(IS_PUBLIC_IGNORE_JWT_KEY, true);
