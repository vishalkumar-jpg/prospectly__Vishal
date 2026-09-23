import { Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { MARKETPLACE_BOUNTY_SPLIT } from "modules/global-marketplace/global-marketplace.constants";
import {
  formatBountyAmount,
  formatLifecycleDate,
  formatProspectName,
  formatUserDisplayName,
  renderLifecycleEmail,
} from "./introduction-notification-render.helper";
import { sendEmailsInBatches } from "./introduction-notification-send.helper";
import { INTRODUCTION_NOTIFICATION_TYPE } from "../introduction-notifications.constants";
import { buildSharerClaimsUrl } from "../introduction-notification-urls.util";

async function loadUserDisplayName(
  db: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<string> {
  const [user] = await db
    .select({
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return user ? formatUserDisplayName(user) : "Someone";
}

export async function processSharerRequestClaimed(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  logger: Logger,
  requestId: string,
  claimId: string
): Promise<void> {
  const [claim] = await db
    .select()
    .from(schema.marketplaceClaims)
    .where(eq(schema.marketplaceClaims.id, claimId))
    .limit(1);

  if (!claim || claim.status !== "completed") {
    logger.warn(
      `INTRO_NOTIFICATION :: sharer_request_claimed :: skip claim ${claimId}`
    );
    return;
  }

  if (!claim.sharerId || claim.sharerId === claim.claimerId) {
    logger.log(
      `INTRO_NOTIFICATION :: sharer_request_claimed :: skip self/no sharer claim ${claimId}`
    );
    return;
  }

  const [sharer] = await db
    .select({
      email: schema.users.email,
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      isActive: schema.users.isActive,
      deletedAt: schema.users.deletedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, claim.sharerId))
    .limit(1);

  if (!sharer?.email?.trim() || sharer.deletedAt || !sharer.isActive) {
    logger.warn(
      `INTRO_NOTIFICATION :: sharer_request_claimed :: inactive sharer claim ${claimId}`
    );
    return;
  }

  const [request] = await db
    .select()
    .from(schema.introductionRequests)
    .where(eq(schema.introductionRequests.id, requestId))
    .limit(1);

  if (!request) {
    logger.warn(
      `INTRO_NOTIFICATION :: sharer_request_claimed :: request ${requestId} not found`
    );
    return;
  }

  const sharerName = formatUserDisplayName(sharer);
  const claimerName = await loadUserDisplayName(db, claim.claimerId);
  const requesterName = request.requesterId
    ? await loadUserDisplayName(db, request.requesterId)
    : "The requester";

  const bountyAmount = formatBountyAmount(request.bountyAmount);
  const sharerShare = formatBountyAmount(
    claim.sharerShare ??
      Number(request.bountyAmount ?? 0) * MARKETPLACE_BOUNTY_SPLIT
  );
  const splitPercentage = (MARKETPLACE_BOUNTY_SPLIT * 100).toFixed(0);

  const { subject, html } = await renderLifecycleEmail(
    emailsService,
    Slug.MarketplaceSharerRequestClaimed,
    {
      sharerName,
      claimerName,
      prospectName: formatProspectName(request.contactName),
      requesterName,
      bountyAmount,
      sharerShare,
      claimedDate: formatLifecycleDate(claim.claimedAt),
      claimsUrl: buildSharerClaimsUrl(claimId),
      splitPercentage,
    }
  );

  await sendEmailsInBatches(
    emailsService,
    logger,
    [
      {
        to: sharer.email.trim(),
        subject,
        html,
        slug: Slug.MarketplaceSharerRequestClaimed,
      },
    ],
    INTRODUCTION_NOTIFICATION_TYPE.SHARER_REQUEST_CLAIMED
  );
}
