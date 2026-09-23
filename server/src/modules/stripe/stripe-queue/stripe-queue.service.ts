import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  STRIPE_QUEUE_NAME,
  STRIPE_JOB_TYPES,
  STRIPE_QUEUE_CONFIG,
} from "./stripe-queue.constants";
import { CreateCustomerJobData } from "./stripe-queue.types";

@Injectable()
export class StripeQueueService {
  private readonly logger = new Logger(StripeQueueService.name);

  constructor(
    @InjectQueue(STRIPE_QUEUE_NAME)
    private readonly queue: Queue<CreateCustomerJobData>
  ) {}

  async queueCreateCustomer(
    userId: string,
    email: string,
    fullName?: string
  ): Promise<string> {
    const job = await this.queue.add(
      STRIPE_JOB_TYPES.CREATE_CUSTOMER,
      {
        userId,
        email,
        fullName,
      },
      STRIPE_QUEUE_CONFIG.defaultJobOptions
    );

    return job.id || "";
  }
}
