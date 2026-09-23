import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ResumeFacetRollupService } from "modules/recruitment/resume-indexing/services/resume-facet-rollup.service";

/**
 * The self-healing half of the facet rollup (ADR-005 §8, plan §4.3).
 *
 * Incremental recomputes run on the indexing path, which covers everything a
 * résumé change touches — but not everything the counts depend on. Two known
 * drift sources it cannot see:
 *
 * - Contact-side edits. `company` and `source` come from `contacts`, and nothing
 *   re-indexes a résumé when a contact record is edited.
 * - A rollup that failed. Its errors are swallowed by design, so an index never
 *   fails because of one — which means a failure leaves stale counts behind and
 *   nothing retries them.
 *
 * A counter that can drift and never self-corrects eventually reports numbers
 * nobody trusts, and facet counts are what the quick-filter row is built from.
 * Full rebuild rather than reconciliation: the whole table is regenerable, and
 * "recompute everything" has no edge cases to get wrong.
 */
@Injectable()
export class ResumeFacetRollupCronService {
  private readonly logger = new Logger(ResumeFacetRollupCronService.name);

  constructor(private readonly facetRollup: ResumeFacetRollupService) {}

  /** 03:15 IST — after the day's indexing has settled, before anyone is searching. */
  @Cron("0 15 3 * * *", { timeZone: "Asia/Kolkata" })
  async rebuildFacetCounts(): Promise<void> {
    this.logger.log("RESUME_FACET_ROLLUP_CRON :: rebuildFacetCounts : START");

    try {
      await this.facetRollup.rebuildAll();
      this.logger.log(
        "RESUME_FACET_ROLLUP_CRON :: rebuildFacetCounts : COMPLETE"
      );
    } catch (error) {
      // Swallowed like the incremental path: a failed rebuild must not take the
      // worker down, and the next night's run is the retry.
      this.logger.error(
        `RESUME_FACET_ROLLUP_CRON :: rebuildFacetCounts : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }
}
