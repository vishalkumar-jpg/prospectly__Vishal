import { SetMetadata } from "@nestjs/common";

export const SKIP_CSRF_KEY = "skipCSRF";
export const SkipCSRF = () => SetMetadata(SKIP_CSRF_KEY, true);
