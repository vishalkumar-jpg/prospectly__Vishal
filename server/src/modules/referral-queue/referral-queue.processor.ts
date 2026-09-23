import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import { Job } from "bullmq";
import {
  REFERRAL_QUEUE_NAME,
  REFERRAL_JOB_TYPES,
} from "./referral-queue.constants";
import {
  UpdateReferralProgressJobData,
  VerifyContactsJobData,
  CheckThresholdsJobData,
  SendInviteEmailJobData,
} from "./referral-queue.types";
import { ReferralsService } from "../referrals/referrals.service";
import { VerificationService } from "../verification/verification.service";

@Processor(REFERRAL_QUEUE_NAME)
export class ReferralQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ReferralQueueProcessor.name);

  constructor(
    @Inject(ReferralsService)
    private readonly referralsService: ReferralsService,
    @Inject(VerificationService)
    private readonly verificationService: VerificationService
  ) {
    super();
  }

  async process(
    job: Job<
      | UpdateReferralProgressJobData
      | VerifyContactsJobData
      | CheckThresholdsJobData
      | SendInviteEmailJobData
    >
  ): Promise<void> {
    const { data, name } = job;

    this.logger.log(`Processing referral queue job: ${name}`, {
      jobId: job.id,
    });

    try {
      switch (name) {
        case REFERRAL_JOB_TYPES.UPDATE_REFERRAL_PROGRESS:
          await this.processUpdateReferralProgress(
            data as UpdateReferralProgressJobData
          );
          break;

        case REFERRAL_JOB_TYPES.VERIFY_CONTACTS:
          await this.processVerifyContacts(data as VerifyContactsJobData);
          break;

        case REFERRAL_JOB_TYPES.CHECK_THRESHOLDS:
          await this.processCheckThresholds(data as CheckThresholdsJobData);
          break;

        case REFERRAL_JOB_TYPES.SEND_INVITE_EMAIL:
          await this.processSendInviteEmail(data as SendInviteEmailJobData);
          break;

        default:
          this.logger.warn(`Unknown job type: ${name}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing referral queue job ${name}: ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  private async processUpdateReferralProgress(
    data: UpdateReferralProgressJobData
  ): Promise<void> {
    const { inviteId, acceptedUserId, ...statelessData } = data;
    await this.referralsService.updateReferralProgressOnAcceptance(
      inviteId,
      acceptedUserId,
      statelessData.senderUserId ? (statelessData as AnyType) : undefined
    );
  }

  private async processVerifyContacts(
    data: VerifyContactsJobData
  ): Promise<void> {
    // Verify contacts for user and plan
    const count = await this.referralsService.calculateVerifiedContacts(
      data.userId,
      data.planId
    );

    this.logger.log(
      `Verified contacts for user ${data.userId}, plan ${data.planId}: ${count}`
    );
  }

  private async processCheckThresholds(
    data: CheckThresholdsJobData
  ): Promise<void> {
    const threshold = await this.referralsService.checkReferralThreshold(
      data.userId,
      data.planId
    );

    if (threshold.met) {
      this.logger.log(
        `Threshold met for user ${data.userId}, plan ${data.planId}`
      );
      // TODO: Award coupon via admin repo API or direct database update
    }
  }

  private async processSendInviteEmail(
    data: SendInviteEmailJobData
  ): Promise<void> {
    // Email sending is handled by admin repo
    // This job is just for tracking/logging
    this.logger.log(`Invite email should be sent for invite ${data.inviteId}`);
  }
}
