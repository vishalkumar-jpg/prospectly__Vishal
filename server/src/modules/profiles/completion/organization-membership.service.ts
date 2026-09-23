import { Injectable } from "@nestjs/common";
import * as schema from "database/schema";
import { Transaction } from "./completion.types";
import { OrganizationLookupService } from "./organization-lookup.service";
import { NEW_ORGANIZATION_DEFAULTS } from "./profile-completion.constants";

/** Organisation writes performed by the completion gate. Always transactional. */
@Injectable()
export class OrganizationMembershipService {
  constructor(
    private readonly organizationLookupService: OrganizationLookupService
  ) {}

  /** Creates an organisation pending admin approval and returns its id. */
  async create(tx: Transaction, userId: string, name: string) {
    await this.organizationLookupService.assertCreateAllowed(tx, userId);
    await this.organizationLookupService.assertNameAvailable(tx, name);

    const [created] = await tx
      .insert(schema.organisation)
      .values({
        name,
        isActive: NEW_ORGANIZATION_DEFAULTS.IS_ACTIVE,
        createdBy: userId,
      })
      .returning({ id: schema.organisation.id });

    return created.id;
  }

  async addMember(tx: Transaction, userId: string, organizationId: string) {
    await this.organizationLookupService.assertOrganizationExists(
      tx,
      organizationId
    );

    await tx.insert(schema.organisationMemberSchema).values({
      organisationId: organizationId,
      userId,
      // Self-selected membership carries no privileges: every org access check
      // in the app requires `isVerified`, which only an invite sets.
      isVerified: false,
      createdBy: userId,
    });
  }
}
