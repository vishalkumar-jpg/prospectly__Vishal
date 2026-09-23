import { Injectable, Logger } from "@nestjs/common";
import { calculateBountyAmounts } from "services/geminiBountyService";
import { AiUsageLoggerService } from "services/ai-usage-logger.service";
import { BountyDbUpdaterService } from "./bounty-db-updater.service";
import { BountyTypesenseSyncService } from "./bounty-typesense-sync.service";
import { CalculateBountyDto } from "./bounty-calculator.dto";

interface CalculateBountyResult {
  success: boolean;
  bountyAmount: number | null;
  skipped?: boolean;
}

@Injectable()
export class BountyCalculatorService {
  private readonly logger = new Logger(BountyCalculatorService.name);

  constructor(
    private readonly bountyDbUpdater: BountyDbUpdaterService,
    private readonly bountyTypesenseSync: BountyTypesenseSyncService,
    private readonly aiUsageLogger: AiUsageLoggerService
  ) {}

  async calculateBounty(
    dto: CalculateBountyDto,
    userId: string
  ): Promise<CalculateBountyResult> {
    try {
      // 1. Fetch contact details + enrichment data from DB
      const contactData = await this.bountyDbUpdater.fetchContactDetails(
        dto.id
      );
      if (!contactData) {
        this.logger.warn(
          `BOUNTY_CALCULATOR :: CALCULATE_BOUNTY : Contact not found: ${dto.id}`
        );
        return { success: false, bountyAmount: null };
      }

      // 1b. If bounty already exists, return it without calling Gemini
      const existingBounty = parseFloat(contactData.bounty_amount || "0");
      if (existingBounty > 0) {
        return { success: true, bountyAmount: existingBounty, skipped: true };
      }

      // 2. Call Gemini to calculate bounty
      const results = await calculateBountyAmounts([contactData], {
        aiUsageLogger: this.aiUsageLogger,
        trackingData: {
          userId,
          actionType: "introduction-bounty",
        },
      });

      // 3. Extract bounty from result (index 0)
      const bounty = results.get(0);

      this.logger.debug(
        `BOUNTY_CALCULATOR :: CALCULATE_BOUNTY : Gemini bounty result for contact ${dto.id} = ${bounty}`
      );

      if (bounty === undefined || bounty < 0) {
        return { success: false, bountyAmount: null };
      }

      // 4. Persist to DB + sync to Typesense
      const finalBounty = await this.bountyDbUpdater.updateContactBounty(
        Number(dto.id),
        bounty
      );
      await this.bountyTypesenseSync.syncContactBounty(dto.id, finalBounty);

      return { success: true, bountyAmount: finalBounty };
    } catch (error) {
      this.logger.error(
        `BOUNTY_CALCULATOR :: CALCULATE_BOUNTY : ERROR : ${error}`
      );
      return { success: false, bountyAmount: null };
    }
  }
}
