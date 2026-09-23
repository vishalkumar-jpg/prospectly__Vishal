import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  REFERRAL_QUEUE_NAME,
  REFERRAL_JOB_TYPES,
  REFERRAL_QUEUE_CONFIG,
} from "./referral-queue.constants";
import {
  UpdateReferralProgressJobData,
  VerifyContactsJobData,
  CheckThresholdsJobData,
  SendInviteEmailJobData,
} from "./referral-queue.types";

@Injectable()
export class ReferralQueueService {
  private readonly logger = new Logger(ReferralQueueService.name);

  constructor(
    @InjectQueue(REFERRAL_QUEUE_NAME)
    private readonly queue: Queue<
      | UpdateReferralProgressJobData
      | VerifyContactsJobData
      | CheckThresholdsJobData
      | SendInviteEmailJobData
    >
  ) {}

  async enqueueReferralProgressUpdate(
    inviteId: string,
    acceptedUserId: string,
    statelessData?: {
      senderUserId: string;
      planId: string;
      planName: string;
      email: string;
    }
  ): Promise<string> {
    const job = await this.queue.add(
      REFERRAL_JOB_TYPES.UPDATE_REFERRAL_PROGRESS,
      {
        inviteId: inviteId.toString(),
        acceptedUserId,
        ...statelessData,
      },
      REFERRAL_QUEUE_CONFIG.defaultJobOptions
    );

    return job.id || "";
  }

  async enqueueContactVerification(
    userId: string,
    planId: string
  ): Promise<string> {
    const job = await this.queue.add(
      REFERRAL_JOB_TYPES.VERIFY_CONTACTS,
      {
        userId,
        planId,
      },
      REFERRAL_QUEUE_CONFIG.defaultJobOptions
    );

    return job.id || "";
  }

  async enqueueThresholdCheck(userId: string, planId: string): Promise<string> {
    const job = await this.queue.add(
      REFERRAL_JOB_TYPES.CHECK_THRESHOLDS,
      {
        userId,
        planId,
      },
      REFERRAL_QUEUE_CONFIG.defaultJobOptions
    );

    return job.id || "";
  }

  async enqueueInviteEmail(inviteId: string): Promise<string> {
    const job = await this.queue.add(
      REFERRAL_JOB_TYPES.SEND_INVITE_EMAIL,
      {
        inviteId: inviteId.toString(),
      },
      REFERRAL_QUEUE_CONFIG.defaultJobOptions
    );

    return job.id || "";
  }
}
