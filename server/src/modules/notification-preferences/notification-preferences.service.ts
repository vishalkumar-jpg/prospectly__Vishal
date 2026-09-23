import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "database/schema";
import { notificationCategories } from "database/schema/notification-categories.schema";
import { userNotificationPreferences } from "database/schema/user-notification-preferences.schema";
import { maskEmail } from "utils/maskingUtils";
import {
  NOTIFICATION_GROUP_LABELS,
  NOTIFICATION_PREFERENCES_MESSAGES,
  SUPPRESSION_REASONS,
  SUPPRESSION_SOURCES,
} from "./notification-preferences.constants";
import { NotificationSendGateService } from "./notification-send-gate.service";
import { UnsubscribeTokenService } from "./unsubscribe-token.service";
import {
  applyNonRegisteredPreferences,
  applyOneClickRegistered,
  applyRegisteredPreferences,
} from "./notification-preferences-save.helper";

export type PreferenceCategoryView = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  groupKey: string;
  groupLabel: string;
  isMandatory: boolean;
  enabled: boolean;
};

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly sendGate: NotificationSendGateService,
    private readonly tokenService: UnsubscribeTokenService,
    private readonly configService: ConfigService
  ) {}

  async getCategoriesForUser(userId: string) {
    return this.buildCategoryViews({ mode: "registered", userId });
  }

  async getCategoriesForPublic(params: {
    u?: string;
    e?: string;
    sig?: string;
  }) {
    const ctx = this.resolvePublicContext(params);
    return this.buildCategoryViews(ctx);
  }

  async saveForUser(
    userId: string,
    body: {
      categories: { categoryId: string; enabled: boolean }[];
      unsubscribeAll?: boolean;
    }
  ) {
    await applyRegisteredPreferences(
      this.db,
      this.sendGate,
      userId,
      body.categories,
      body.unsubscribeAll
    );
    return this.getCategoriesForUser(userId);
  }

  async saveForPublic(body: {
    u?: string;
    e?: string;
    sig: string;
    categories: { categoryId: string; enabled: boolean }[];
    unsubscribeAll?: boolean;
  }) {
    const ctx = this.resolvePublicContext(body);

    if (ctx.mode === "registered") {
      await applyRegisteredPreferences(
        this.db,
        this.sendGate,
        ctx.userId,
        body.categories,
        body.unsubscribeAll
      );
      return this.buildCategoryViews(ctx);
    }

    await applyNonRegisteredPreferences(
      this.sendGate,
      ctx.email,
      body.categories,
      body.unsubscribeAll
    );
    return this.buildCategoryViews(ctx);
  }

  async oneClickUnsubscribe(params: {
    u?: string;
    e?: string;
    sig: string;
    category?: string;
  }) {
    const ctx = this.resolvePublicContext(params);

    if (ctx.mode === "registered") {
      await applyOneClickRegistered(this.db, ctx.userId, params.category);
      return { success: true };
    }

    await this.sendGate.upsertSuppression(
      ctx.email,
      SUPPRESSION_REASONS.UNSUBSCRIBED,
      SUPPRESSION_SOURCES.LINK
    );
    return { success: true };
  }

  async buildUnsubscribeUrlForRecipient(
    recipientEmail: string,
    categoryKey?: string
  ): Promise<string> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "";
    const normalized = this.sendGate.normalizeEmail(recipientEmail);

    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, normalized),
      columns: { id: true },
    });

    if (user) {
      return this.tokenService.buildRegisteredUnsubscribeUrl(
        frontendUrl,
        user.id,
        categoryKey
      );
    }

    return this.tokenService.buildEmailUnsubscribeUrl(
      frontendUrl,
      normalized,
      categoryKey
    );
  }

  private resolvePublicContext(params: {
    u?: string;
    e?: string;
    sig?: string;
  }):
    | { mode: "registered"; userId: string; maskedEmail?: string }
    | { mode: "email"; email: string; maskedEmail: string } {
    const { u, e, sig } = params;
    if (!sig?.trim()) {
      throw new UnauthorizedException(
        NOTIFICATION_PREFERENCES_MESSAGES.ERROR.INVALID_TOKEN
      );
    }

    if (u) {
      if (!this.tokenService.verifyUser(u, sig)) {
        throw new UnauthorizedException(
          NOTIFICATION_PREFERENCES_MESSAGES.ERROR.INVALID_TOKEN
        );
      }
      return { mode: "registered", userId: u };
    }

    if (e) {
      const email = this.tokenService.decodeEmailParam(e);
      if (!this.tokenService.verifyEmail(email, sig)) {
        throw new UnauthorizedException(
          NOTIFICATION_PREFERENCES_MESSAGES.ERROR.INVALID_TOKEN
        );
      }
      return {
        mode: "email",
        email,
        maskedEmail: maskEmail(email) ?? email,
      };
    }

    throw new BadRequestException("Missing unsubscribe token parameters");
  }

  private async buildCategoryViews(
    ctx:
      | { mode: "registered"; userId: string; maskedEmail?: string }
      | { mode: "email"; email: string; maskedEmail: string }
  ) {
    const categories = await this.db
      .select()
      .from(notificationCategories)
      .orderBy(asc(notificationCategories.sortOrder));

    let disabledIds = new Set<string>();
    let unsubscribeAll = false;
    let maskedEmail = "maskedEmail" in ctx ? ctx.maskedEmail : undefined;

    if (ctx.mode === "registered") {
      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.id, ctx.userId),
        columns: { email: true },
        with: { userConfiguration: true },
      });
      maskedEmail = maskEmail(user?.email ?? "") ?? undefined;
      const config = user?.userConfiguration as
        | { isUserUnsubscribe?: boolean }
        | null
        | undefined;
      unsubscribeAll = Boolean(config?.isUserUnsubscribe);

      const prefs = await this.db
        .select()
        .from(userNotificationPreferences)
        .where(eq(userNotificationPreferences.userId, ctx.userId));

      disabledIds = new Set(
        prefs.filter((p) => p.enabled === false).map((p) => p.categoryId)
      );
    } else {
      unsubscribeAll = await this.sendGate.isEmailSuppressed(ctx.email);
    }

    const items: PreferenceCategoryView[] = categories.map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      description: c.description,
      groupKey: c.groupKey,
      groupLabel: NOTIFICATION_GROUP_LABELS[c.groupKey] ?? c.groupKey,
      isMandatory: c.isMandatory,
      enabled: c.isMandatory
        ? true
        : ctx.mode === "email"
          ? !unsubscribeAll
          : !unsubscribeAll && !disabledIds.has(c.id),
    }));

    return {
      maskedEmail,
      unsubscribeAll,
      isRegistered: ctx.mode === "registered",
      categories: items,
    };
  }
}
