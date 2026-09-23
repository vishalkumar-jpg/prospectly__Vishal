import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";

enum TrustScoreActionType {
  ADD = "ADD",
  SUBTRACT = "SUBTRACT",
}

enum TrustScoreTriggerEvent {
  GOOGLE_CONTACT_IMPORT = "google_contact_import",
  MICROSOFT_CONTACT_IMPORT = "microsoft_contact_import",
  APPLE_CONTACT_IMPORT = "apple_contact_import",
  LINKEDIN_ZIP_IMPORT = "linkedin_zip_import",
  HIGH_SUCCESS_RATE = "high_success_rate",
  NO_RESPONSE_48H = "no_response_48h",
  RESPONSE_WITHIN_48H = "response_within_48h",
  CSV_MANUAL_UPLOAD = "csv_manual_upload",
  POSITIVE_PEER_REVIEWS = "positive_peer_reviews",
}

enum TrustScoreConfigKey {
  MIN_REVIEWS = "min_reviews",
  MIN_AVG_RATING = "min_avg_rating",
  MIN_CONTACTS = "min_contacts",
  MIN_REQUESTS = "min_requests",
  MIN_AVG_SUCCESS = "min_avg_success",
  MIN_AVG_RESPONSE = "min_avg_response",
}

enum TrustScoreConditionKey {
  EXCLUDE_IF_QUICK_RESPONSE_APPLIED = "exclude_if_quick_response_applied",
}

@Injectable()
export class TrustScoreManagementSeeder {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async seedDefaultTrustScoreRules() {
    const defaultRules = [
      {
        slug: TrustScoreTriggerEvent.GOOGLE_CONTACT_IMPORT,
        name: "Google Contact Import",
        description:
          "Award trust score when user imports contacts from Google account",
        actionType: TrustScoreActionType.ADD,
        points: 1.0,
        isActive: true,
        isConfigurable: true,
        configParams: {
          [TrustScoreConfigKey.MIN_CONTACTS]: 4,
        },
        triggerEvent: TrustScoreTriggerEvent.GOOGLE_CONTACT_IMPORT,
        priority: 1,
        conditions: null,
      },
      {
        slug: TrustScoreTriggerEvent.MICROSOFT_CONTACT_IMPORT,
        name: "Microsoft Contact Import",
        description:
          "Award trust score when user imports contacts from Microsoft account",
        actionType: TrustScoreActionType.ADD,
        points: 1.0,
        isActive: true,
        isConfigurable: true,
        configParams: {
          [TrustScoreConfigKey.MIN_CONTACTS]: 5,
        },
        triggerEvent: TrustScoreTriggerEvent.MICROSOFT_CONTACT_IMPORT,
        priority: 2,
        conditions: null,
      },
      {
        slug: TrustScoreTriggerEvent.APPLE_CONTACT_IMPORT,
        name: "Apple Contact Import",
        description:
          "Award trust score when user imports contacts from Apple account",
        actionType: TrustScoreActionType.ADD,
        points: 1.0,
        isActive: true,
        isConfigurable: true,
        configParams: {
          [TrustScoreConfigKey.MIN_CONTACTS]: 5,
        },
        triggerEvent: TrustScoreTriggerEvent.APPLE_CONTACT_IMPORT,
        priority: 3,
        conditions: null,
      },
      {
        slug: TrustScoreTriggerEvent.LINKEDIN_ZIP_IMPORT,
        name: "LinkedIn ZIP Data Import",
        description: "Award trust score when user imports LinkedIn ZIP data",
        actionType: TrustScoreActionType.ADD,
        points: 3.0,
        isActive: true,
        isConfigurable: true,
        configParams: {
          [TrustScoreConfigKey.MIN_CONTACTS]: 8,
        },
        triggerEvent: TrustScoreTriggerEvent.LINKEDIN_ZIP_IMPORT,
        priority: 4,
        conditions: null,
      },
      {
        slug: TrustScoreTriggerEvent.CSV_MANUAL_UPLOAD,
        name: "CSV Manual Upload",
        description:
          "Award trust score when user manually uploads CSV contacts",
        actionType: TrustScoreActionType.ADD,
        points: 1.0,
        isActive: true,
        isConfigurable: true,
        configParams: {
          [TrustScoreConfigKey.MIN_CONTACTS]: 5,
        },
        triggerEvent: TrustScoreTriggerEvent.CSV_MANUAL_UPLOAD,
        priority: 5,
        conditions: null,
      },
      {
        slug: TrustScoreTriggerEvent.HIGH_SUCCESS_RATE,
        name: "High Success Rate",
        description:
          "Award trust score when user maintains high success rate on introduction requests",
        actionType: TrustScoreActionType.ADD,
        points: 1.0,
        isActive: true,
        isConfigurable: true,
        configParams: {
          [TrustScoreConfigKey.MIN_REQUESTS]: 2,
          [TrustScoreConfigKey.MIN_AVG_SUCCESS]: 80,
        },
        triggerEvent: TrustScoreTriggerEvent.HIGH_SUCCESS_RATE,
        priority: 6,
        conditions: null,
      },
      {
        slug: TrustScoreTriggerEvent.POSITIVE_PEER_REVIEWS,
        name: "Positive Peer Reviews",
        description:
          "Award trust score when user receives 5 or more positive reviews with 4+ average rating",
        actionType: TrustScoreActionType.ADD,
        points: 1.0,
        isActive: true,
        isConfigurable: true,
        configParams: {
          [TrustScoreConfigKey.MIN_REVIEWS]: 2,
          [TrustScoreConfigKey.MIN_AVG_RATING]: 4,
        },
        triggerEvent: TrustScoreTriggerEvent.POSITIVE_PEER_REVIEWS,
        priority: 7,
        conditions: null,
      },
      {
        slug: TrustScoreTriggerEvent.RESPONSE_WITHIN_48H,
        name: "Response Within 48 Hours",
        description:
          "Award trust score when user responds within 48 hours (not if quick_response already applied)",
        actionType: TrustScoreActionType.ADD,
        points: 1.0,
        isActive: true,
        isConfigurable: true,
        configParams: {
          [TrustScoreConfigKey.MIN_AVG_RESPONSE]: 70,
        },
        triggerEvent: TrustScoreTriggerEvent.RESPONSE_WITHIN_48H,
        priority: 8,
        conditions: {
          [TrustScoreConditionKey.EXCLUDE_IF_QUICK_RESPONSE_APPLIED]: false,
        },
      },
      {
        slug: TrustScoreTriggerEvent.NO_RESPONSE_48H,
        name: "No Response After 48 Hours",
        description:
          "Reduce trust score when user doesn't respond to a request after 48 hours",
        actionType: TrustScoreActionType.SUBTRACT,
        points: 1.0,
        isActive: true,
        isConfigurable: true,
        configParams: {
          [TrustScoreConfigKey.MIN_AVG_SUCCESS]: 10,
        },
        triggerEvent: TrustScoreTriggerEvent.NO_RESPONSE_48H,
        priority: 9,
        conditions: null,
      },
    ];

    for (const ruleData of defaultRules) {
      const existing = await this.db.query.trustScoreRules.findFirst({
        where: and(
          eq(schema.trustScoreRules.slug, ruleData.slug),
          isNull(schema.trustScoreRules.deletedAt)
        )!,
      });

      if (!existing) {
        await this.db.insert(schema.trustScoreRules).values({
          slug: ruleData.slug,
          name: ruleData.name,
          description: ruleData.description,
          actionType: ruleData.actionType,
          points: ruleData.points.toString(),
          isActive: ruleData.isActive,
          isConfigurable: ruleData.isConfigurable,
          configParams: ruleData.configParams,
          triggerEvent: ruleData.triggerEvent,
          priority: ruleData.priority,
          conditions: ruleData.conditions,
        });
      }
    }
  }
}
