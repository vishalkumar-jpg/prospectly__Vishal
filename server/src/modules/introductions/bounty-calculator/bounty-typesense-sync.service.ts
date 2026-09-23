import { Injectable, Inject, Logger } from "@nestjs/common";
import { Client } from "typesense";
import {
  TYPESENSE_TOKEN,
  TYPESENSE_COLLECTION_NAME,
} from "modules/typesense/core/typesense.constants";

@Injectable()
export class BountyTypesenseSyncService {
  private readonly logger = new Logger(BountyTypesenseSyncService.name);

  constructor(@Inject(TYPESENSE_TOKEN) private readonly client: Client) {}

  /**
   * Update bounty_amount on a contact document in Typesense
   * Never throws — sync failure should not fail the API response
   */
  async syncContactBounty(
    contactId: string,
    bountyAmount: number
  ): Promise<void> {
    try {
      await this.client
        .collections(TYPESENSE_COLLECTION_NAME)
        .documents(contactId)
        .update({ bounty_amount: bountyAmount });
    } catch (error) {
      this.logger.error(
        `BOUNTY_TYPESENSE_SYNC :: SYNC_CONTACT_BOUNTY : ERROR : ${error}`
      );
    }
  }
}
