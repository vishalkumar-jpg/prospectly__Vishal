import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CreateWithPaymentService } from "modules/introductions/create-with-payment/create-with-payment.service";

@Injectable()
export class PendingFeedbackGuard implements CanActivate {
  constructor(
    @Inject(CreateWithPaymentService)
    private readonly createWithPaymentService: CreateWithPaymentService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    // Run the check (throws ForbiddenException if pending feedback exists)
    await this.createWithPaymentService.canCreateRequestWithFeedbackCheck(
      userId
    );
    return true;
  }
}
