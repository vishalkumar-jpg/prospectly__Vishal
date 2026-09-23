import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { and, desc, eq, isNull, sql, SQL } from "drizzle-orm";
import { userModuleEnum } from "database/schema/enums";
import { OrganisationModuleConfig } from "database/schema/organisation-module-access.schema";
import {
  MODULE_CONFIG_KEYS,
  RECRUITING_MODULE,
} from "./module-access.constants";

export type UserModule = (typeof userModuleEnum.enumValues)[number];

@Injectable()
export class ModuleAccessService {
  private readonly logger = new Logger(ModuleAccessService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  // Shared "qualifying grant" join/where rules, centralized so every lookup
  // applies the same definition: a verified, non-deleted membership in an active
  // (non-deleted) organisation that holds a non-deleted module grant.

  private activeOrgJoin(): SQL | undefined {
    return and(
      eq(
        schema.organisation.id,
        schema.organisationMemberSchema.organisationId
      ),
      eq(schema.organisation.isActive, true),
      isNull(schema.organisation.deletedAt)
    );
  }

  private moduleGrantJoin(
    module?: UserModule,
    extraCondition?: SQL
  ): SQL | undefined {
    const conditions: SQL[] = [
      eq(
        schema.organisationModuleAccess.organisationId,
        schema.organisationMemberSchema.organisationId
      ),
      isNull(schema.organisationModuleAccess.deletedAt),
    ];
    if (module)
      conditions.push(eq(schema.organisationModuleAccess.module, module));
    if (extraCondition) conditions.push(extraCondition);
    return and(...conditions);
  }

  private verifiedMembershipWhere(userId: string): SQL | undefined {
    return and(
      eq(schema.organisationMemberSchema.userId, userId),
      eq(schema.organisationMemberSchema.isVerified, true),
      isNull(schema.organisationMemberSchema.deletedAt)
    );
  }

  /**
   * Returns the distinct list of modules the user's organisation(s) have been
   * granted. A user qualifies through any verified, non-deleted membership in an
   * active (non-deleted) organisation that holds a non-deleted module grant.
   */
  async getAccessibleModules(userId: string): Promise<UserModule[]> {
    const rows = await this.db
      .selectDistinct({ module: schema.organisationModuleAccess.module })
      .from(schema.organisationMemberSchema)
      .innerJoin(schema.organisation, this.activeOrgJoin())
      .innerJoin(schema.organisationModuleAccess, this.moduleGrantJoin())
      .where(this.verifiedMembershipWhere(userId));

    return rows.map((row) => row.module);
  }

  /**
   * Returns true when the user has access to the given module through any of
   * their qualifying organisation memberships.
   */
  async hasModuleAccess(userId: string, module: UserModule): Promise<boolean> {
    return this.hasQualifyingModuleGrant(userId, module);
  }

  /**
   * Returns true when any organisation the user belongs to has the early
   * candidate-details access flag enabled on its recruiting module grant. Used to
   * reveal the candidate's original resume from the `in_review` stage instead of
   * only after an interview is booked.
   */
  async isEarlyCandidateDetailsAccessEnabledForUser(
    userId: string
  ): Promise<boolean> {
    return this.hasQualifyingModuleGrant(
      userId,
      RECRUITING_MODULE,
      sql`${schema.organisationModuleAccess.config} ->> ${MODULE_CONFIG_KEYS.EARLY_CANDIDATE_DETAILS_ACCESS} = 'true'`
    );
  }

  /**
   * Returns the recruiting module config for the user's qualifying organisation.
   * A user is expected to belong to a single org; when they belong to more than
   * one, the most recently joined org wins. Returns null when the user has no
   * qualifying membership/grant.
   */
  async getRecruitingModuleConfig(
    userId: string
  ): Promise<OrganisationModuleConfig | null> {
    const [row] = await this.db
      .select({ config: schema.organisationModuleAccess.config })
      .from(schema.organisationMemberSchema)
      .innerJoin(schema.organisation, this.activeOrgJoin())
      .innerJoin(
        schema.organisationModuleAccess,
        this.moduleGrantJoin(RECRUITING_MODULE)
      )
      .where(this.verifiedMembershipWhere(userId))
      .orderBy(desc(schema.organisationMemberSchema.createdAt))
      .limit(1);

    return row?.config ?? null;
  }

  /**
   * Shared join for "does this user have a qualifying grant for `module`" —
   * verified membership → active organisation → non-deleted module grant. An
   * optional `extraCondition` narrows the grant (e.g. a config flag check).
   */
  private async hasQualifyingModuleGrant(
    userId: string,
    module: UserModule,
    extraCondition?: SQL
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: schema.organisationModuleAccess.id })
      .from(schema.organisationMemberSchema)
      .innerJoin(schema.organisation, this.activeOrgJoin())
      .innerJoin(
        schema.organisationModuleAccess,
        this.moduleGrantJoin(module, extraCondition)
      )
      .where(this.verifiedMembershipWhere(userId))
      .limit(1);

    return Boolean(row);
  }
}
