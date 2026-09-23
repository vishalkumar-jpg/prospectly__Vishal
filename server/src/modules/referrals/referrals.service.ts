import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  forwardRef,
} from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { ReferralProgress } from "database/schema";
import { toUTC } from "utils/dayjs";
import type { AnyType } from "../../types/common";
import { formatReferralProgressForListing as buildReferralProgressListingPayload } from "./referral-progress-formatter";
import {
  dedupeSerializedInvitedUsersByEmail,
  mergeInvitedRowsWithUpsert,
} from "./referral-invited-users-upsert.helper";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { InvitesService } from "../invites/invites.service";
import { INVITE_CONSTANTS } from "../invites/invites.constants";

/** Payload when recording or upserting an invited user in referral_progress JSON */
export interface ReferralInvitedUserInput {
  email: string;
  fullName: string;
  subscriptionPlan: string;
  invitedAt: Date;
  contactId?: string;
  subscriptionPlanId?: string;
  expiresAt?: Date;
  organisationId?: string | null;
  /** ISO 3166-1 alpha-2 payout country stored for resend / invite defaults */
  country?: string;
}

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(SubscriptionsService)
    private readonly subscriptionsService: SubscriptionsService,
    @Inject(forwardRef(() => InvitesService))
    private readonly invitesService: InvitesService
  ) {}

  /**
   * Get user's referral progress
   */
  async getUserReferralProgress(
    userId: string
  ): Promise<ReferralProgress | null> {
    const progress = await this.db.query.referralProgress.findFirst({
      where: eq(schema.referralProgress.userId, userId),
    });

    return progress || null;
  }

  /**
   * Shape returned to clients for GET /referrals/progress (invitedUsers enriched).
   */
  formatReferralProgressForListing(
    progress: ReferralProgress | null
  ): Record<string, unknown> {
    return buildReferralProgressListingPayload(progress);
  }

  /**
   * Get all users' referral progress (for admin)
   */
  async getAllReferralProgress(): Promise<AnyType[]> {
    const allProgress = await this.db.query.referralProgress.findMany({
      with: {
        user: true, // Assuming relation is defined in relations.ts
      },
      orderBy: [desc(schema.referralProgress.updatedAt)],
    });

    return allProgress;
  }

  /**
   * Check if user can invite for a specific plan
   */
  async canUserInvite(userId: string, planId: string): Promise<boolean> {
    // Check if user has active subscription for this plan or higher
    const subscription =
      await this.subscriptionsService.getCurrentSubscription(userId);

    if (!subscription) {
      return false;
    }

    // TODO: Implement plan hierarchy check (e.g., Pro+ can invite for Pro)
    // For now, check if user has subscription for the same plan
    return subscription.plan.id === planId;
  }

  /**
   * Send referral invite
   * Note: This creates the invite record, but actual email sending is handled by admin repo
   */
  async sendReferralInvite(
    userId: string,
    email: string,
    planId: string,
    organisationId?: string
  ): Promise<{ success: boolean; message: string; inviteLink?: string }> {
    // Check if user can invite
    const canInvite = await this.canUserInvite(userId, planId);
    if (!canInvite) {
      throw new BadRequestException(
        "You do not have permission to invite for this plan"
      );
    }

    // Use InvitesService to generate the link
    const inviteLink = await this.invitesService.generateInviteLink(
      userId,
      email,
      planId,
      organisationId
    );

    // Log referral action
    await this.logReferralAction(userId, "invite_sent", {
      email,
      planId,
      organisationId,
      inviteLink,
    });

    return {
      success: true,
      message: "Invite link generated successfully.",
      inviteLink,
    };
  }

  /**
   * Update referral progress when invite is accepted
   */
  async updateReferralProgressOnAcceptance(
    inviteId: string,
    acceptedUserId: string,
    statelessData?: {
      senderUserId: string;
      planId: string;
      planName: string;
      email: string;
    }
  ): Promise<void> {
    let referrerUserId: string | undefined;
    let planId: string | undefined;
    let planName = "Premium Plan";
    let inviteEmail: string | undefined;

    // 1. Get invite details (from DB or stateless data)
    if (inviteId !== INVITE_CONSTANTS.VIRTUAL_ID) {
      const invite = await this.db.query.userInvites.findFirst({
        where: eq(schema.userInvites.id, inviteId),
        with: {
          subscriptionPlan: true,
        },
      });

      if (!invite || !invite.invitedByUserId) {
        return; // Not a user referral or invite not found
      }

      referrerUserId = invite.invitedByUserId;
      planId = invite.subscriptionPlanId;
      planName = (invite as AnyType).subscriptionPlan?.name || planName;
      inviteEmail = invite.email;
    } else if (statelessData) {
      referrerUserId = statelessData.senderUserId;
      planId = statelessData.planId;
      planName = statelessData.planName;
      inviteEmail = statelessData.email;
    }

    if (!referrerUserId || !planId || !inviteEmail) {
      return;
    }
    // Get accepted user details
    const acceptedUser = await this.db.query.users.findFirst({
      where: eq(schema.users.id, acceptedUserId),
    });

    if (!acceptedUser) {
      this.logger.error(`Accepted user profile not found: ${acceptedUserId}`);
      return;
    }

    // Get or create referral progress
    let progress = await this.getUserReferralProgress(referrerUserId);

    if (!progress) {
      // Create new referral progress record
      const [newProgress] = await this.db
        .insert(schema.referralProgress)
        .values({
          userId: referrerUserId,
          totalInvitesSent: 0,
          totalInvitesAccepted: 1,
          acceptedUsers: [
            {
              userId: acceptedUserId,
              email: acceptedUser.email,
              fullName: acceptedUser.fullName,
              subscriptionPlan: planName,
              subscriptionPlanId: planId,
              acceptedAt: toUTC(),
            },
          ],
          invitedUsers: [],
          earnedCoupons: [],
        })
        .returning();
      progress = newProgress;
    } else {
      // Update counts and accepted users list
      const currentAcceptedUsers = Array.isArray(progress.acceptedUsers)
        ? progress.acceptedUsers
        : [];

      // Check if user already in list to avoid duplicates
      const alreadyAccepted = currentAcceptedUsers.some(
        (u: AnyType) => u.userId === acceptedUserId
      );

      if (!alreadyAccepted) {
        currentAcceptedUsers.push({
          userId: acceptedUserId,
          email: acceptedUser.email,
          fullName: acceptedUser.fullName,
          subscriptionPlan: planName,
          subscriptionPlanId: planId,
          acceptedAt: toUTC(),
        });
      }

      await this.db
        .update(schema.referralProgress)
        .set({
          totalInvitesAccepted: alreadyAccepted
            ? progress.totalInvitesAccepted
            : sql`${schema.referralProgress.totalInvitesAccepted} + 1`,
          acceptedUsers: currentAcceptedUsers,
          updatedAt: toUTC(),
        })
        .where(eq(schema.referralProgress.id, progress.id));
    }

    // Log referral action
    await this.logReferralAction(referrerUserId, "invite_accepted", {
      inviteId:
        inviteId === INVITE_CONSTANTS.VIRTUAL_ID ? null : inviteId.toString(),
      acceptedUserId,
      planId,
    });
  }

  /**
   * Increment total invites sent for a user
   */
  async incrementInvitesSent(userId: string, count: number): Promise<void> {
    const progress = await this.db.query.referralProgress.findFirst({
      where: eq(schema.referralProgress.userId, userId),
    });

    if (!progress) {
      await this.db.insert(schema.referralProgress).values({
        userId,
        totalInvitesSent: count,
        totalInvitesAccepted: 0,
        acceptedUsers: [],
        invitedUsers: [],
        earnedCoupons: [],
      });
    } else {
      await this.db
        .update(schema.referralProgress)
        .set({
          totalInvitesSent: sql`${schema.referralProgress.totalInvitesSent} + ${count}`,
          updatedAt: toUTC(),
        })
        .where(eq(schema.referralProgress.id, progress.id));
    }
  }

  /**
   * Update referral progress with invited users details (upsert by email)
   */
  async updateInvitedUsers(
    userId: string,
    invitedUsers: ReferralInvitedUserInput[]
  ): Promise<void> {
    try {
      this.logger.log(
        `Updating referral progress for user ${userId} with ${invitedUsers.length} invited users`
      );

      const serializedInvitedUsers = invitedUsers.map((user) => {
        const row: Record<string, unknown> = {
          email: user.email.toLowerCase().trim(),
          fullName: user.fullName,
          subscriptionPlan: user.subscriptionPlan,
          invitedAt: toUTC(user.invitedAt).toISOString(),
        };
        if (user.contactId !== undefined) {
          row.contactId = user.contactId;
        }
        if (user.subscriptionPlanId !== undefined) {
          row.subscriptionPlanId = user.subscriptionPlanId;
        }
        if (user.expiresAt !== undefined) {
          row.expiresAt = toUTC(user.expiresAt).toISOString();
        }
        if (user.organisationId !== undefined) {
          row.organisationId = user.organisationId;
        }
        if (user.country !== undefined) {
          row.country = user.country;
        }
        return row;
      });

      const serializedInvitedUsersDedup = dedupeSerializedInvitedUsersByEmail(
        serializedInvitedUsers
      );

      const progress = await this.db.query.referralProgress.findFirst({
        where: eq(schema.referralProgress.userId, userId),
      });

      if (!progress) {
        await this.db.insert(schema.referralProgress).values({
          userId,
          totalInvitesSent: serializedInvitedUsersDedup.length,
          totalInvitesAccepted: 0,
          acceptedUsers: [],
          invitedUsers: serializedInvitedUsersDedup,
          earnedCoupons: [],
        });
        this.logger.log(
          `Created new referral progress record for user ${userId} with ${serializedInvitedUsersDedup.length} invited users`
        );
      } else {
        const currentInvitedUsers = Array.isArray(progress.invitedUsers)
          ? (progress.invitedUsers as AnyType[])
          : [];

        const { merged: newInvitedUsers, newCount } =
          mergeInvitedRowsWithUpsert(
            currentInvitedUsers,
            serializedInvitedUsersDedup
          );

        await this.db
          .update(schema.referralProgress)
          .set({
            totalInvitesSent: sql`${schema.referralProgress.totalInvitesSent} + ${newCount}`,
            invitedUsers: newInvitedUsers,
            updatedAt: toUTC(),
          })
          .where(eq(schema.referralProgress.id, progress.id));

        this.logger.log(
          `Updated referral progress for user ${userId}: net-new ${newCount} invites (total rows: ${newInvitedUsers.length})`
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update referral progress for user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }

  /**
   * Calculate verified contacts for a user and plan
   * Runtime calculation: matches accepted invites with imported contacts
   */
  async calculateVerifiedContacts(
    userId: string,
    planId: string
  ): Promise<number> {
    // Get user's referral progress
    const progress = await this.getUserReferralProgress(userId);

    if (!progress || !progress.acceptedUsers) {
      return 0;
    }

    const acceptedUsers = Array.isArray(progress.acceptedUsers)
      ? (progress.acceptedUsers as AnyType[])
      : [];

    // For backward compatibility, also fetch plan name
    const plan = await this.db.query.subscriptionPlan.findFirst({
      where: eq(schema.subscriptionPlan.id, planId),
    });

    // Filter accepted users by planId or name (backward compat)
    const inviteEmails = acceptedUsers
      .filter(
        (u: AnyType) =>
          u.subscriptionPlanId === planId ||
          (plan && u.subscriptionPlan === plan.name)
      )
      .map((u: AnyType) => u.email.toLowerCase().trim());

    if (inviteEmails.length === 0) {
      return 0;
    }

    // Get user's imported contacts
    const contacts = await this.db.query.contacts.findMany({
      where: and(
        eq(schema.contacts.originalImporterId, userId),
        isNull(schema.contacts.deletedAt)
      ),
    });

    // Match contacts with invite emails (case-insensitive)
    const verified = contacts.filter((contact) => {
      const contactEmail = contact.email?.toLowerCase().trim();
      return contactEmail && inviteEmails.includes(contactEmail);
    });

    return verified.length;
  }

  /**
   * Check if referral threshold is met
   * Note: Thresholds are stored in referral_configuration table (admin repo)
   */
  async checkReferralThreshold(
    userId: string,
    planId: string
  ): Promise<{ met: boolean; current: number; threshold: number | null }> {
    // Get verified contacts count
    const verifiedContacts = await this.calculateVerifiedContacts(
      userId,
      planId
    );

    // TODO: Get threshold from referral_configuration table (admin repo)
    // For now, return a default threshold
    const threshold = 10; // Default threshold

    return {
      met: verifiedContacts >= threshold,
      current: verifiedContacts,
      threshold,
    };
  }

  /**
   * Get earned coupons for a user
   */
  async getEarnedCoupons(userId: string): Promise<AnyType[]> {
    const progress = await this.getUserReferralProgress(userId);

    if (!progress || !progress.earnedCoupons) {
      return [];
    }

    // Parse earned coupons JSONB
    const coupons =
      typeof progress.earnedCoupons === "string"
        ? JSON.parse(progress.earnedCoupons)
        : progress.earnedCoupons;

    return Array.isArray(coupons) ? coupons : [];
  }

  /**
   * Audit logging for referral actions
   */
  async logReferralAction(
    userId: string,
    actionType: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await this.db.insert(schema.referralAuditLog).values({
      userId,
      actionType,
      details,
    });

    this.logger.log(
      `Referral action logged: ${actionType} for user ${userId}`,
      details
    );
  }
}
