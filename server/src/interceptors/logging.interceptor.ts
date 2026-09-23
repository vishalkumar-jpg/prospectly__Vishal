import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { toUTC } from "utils/dayjs";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<AnyType> {
    const request = context.switchToHttp().getRequest();
    const { method, ip } = request;
    const url = (request.url || "").replace(/[\r\n]/g, "");
    const userAgent = (request.get("user-agent") || "").replace(/[\r\n]/g, "");
    const now = toUTC().valueOf();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const delay = toUTC().valueOf() - now;

        this.logger.log(
          `${method} ${url} ${statusCode} ${delay}ms - ${userAgent} ${ip}`
        );
      })
    );
  }
}
