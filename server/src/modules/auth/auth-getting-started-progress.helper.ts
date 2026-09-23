import { eq, or } from "drizzle-orm";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { ContactsImportService } from "modules/contact-queue/contacts-import.service";
import { ContactSourceStatusService } from "modules/contact-source-status/contact-source-status.service";
import type {
  GettingStartedProgressDto,
  PreferredWorkspace,
  PrimaryWorkspace,
} from "./auth.types";

async function computeImportComplete(
  userId: string,
  deps: {
    contactsImportService: ContactsImportService;
    contactSourceStatusService: ContactSourceStatusService;
  }
): Promise<boolean> {
  const [linkedinLatest, googleLatest, microsoftLatest, appleLatest] =
    await Promise.all([
      deps.contactsImportService.getLatestContactsImport(userId, "linkedin"),
      deps.contactsImportService.getLatestContactsImport(userId, "google"),
      deps.contactsImportService.getLatestContactsImport(userId, "microsoft"),
      deps.contactsImportService.getLatestContactsImport(userId, "apple"),
    ]);

  const linkedinComplete = linkedinLatest?.status === "completed";
  const hasGoogle = googleLatest?.status === "completed";
  const hasMicrosoft = microsoftLatest?.status === "completed";
  const hasApple = appleLatest?.status === "completed";

  const csvCount =
    await deps.contactSourceStatusService.getContactCountBySource(
      userId,
      "csv"
    );
  const csvImportCount =
    await deps.contactSourceStatusService.getContactCountBySource(
      userId,
      "csv_import"
    );
  const hasCsv = csvCount + csvImportCount > 0;

  return linkedinComplete && (hasGoogle || hasMicrosoft || hasCsv || hasApple);
}

function isPreferredWorkspace(
  value: string | null | undefined
): value is PreferredWorkspace {
  return value === "recruiting" || value === "prospecting" || value === "both";
}

function isPrimaryWorkspace(
  value: string | null | undefined
): value is PrimaryWorkspace {
  return value === "recruiting" || value === "prospecting";
}

/**
 * Progress steps depend on org recruiting access:
 * - With recruiting: 1=Choose Focus, 2=Import Contacts, 3=Get Going
 *   (step 3 complete = has intro request — same as legacy Introduce step)
 * - Without: 1=Import Contacts, 2=Get Going (step3Complete always true)
 */
export async function computeGettingStartedProgress(
  userId: string,
  deps: {
    db: PostgresJsDatabase<typeof schema>;
    contactsImportService: ContactsImportService;
    contactSourceStatusService: ContactSourceStatusService;
    hasRecruitingAccess: boolean;
  }
): Promise<GettingStartedProgressDto> {
  const [config] = await deps.db
    .select({
      preferredWorkspace: schema.userConfigurations.preferredWorkspace,
      primaryWorkspace: schema.userConfigurations.primaryWorkspace,
    })
    .from(schema.userConfigurations)
    .where(eq(schema.userConfigurations.userId, userId))
    .limit(1);

  const storedPreferred = isPreferredWorkspace(config?.preferredWorkspace)
    ? config.preferredWorkspace
    : null;
  const storedPrimary = isPrimaryWorkspace(config?.primaryWorkspace)
    ? config.primaryWorkspace
    : null;
  const importComplete = await computeImportComplete(userId, deps);

  const intro = await deps.db.query.introductionRequests.findFirst({
    where: or(
      eq(schema.introductionRequests.requesterId, userId),
      eq(schema.introductionRequests.acceptedBy, userId)
    ),
    columns: { id: true },
  });
  const introComplete = !!intro;

  if (!deps.hasRecruitingAccess) {
    return {
      step1Complete: importComplete,
      step2Complete: introComplete,
      step3Complete: true,
      preferredWorkspace: "prospecting",
      primaryWorkspace: "prospecting",
      hasFocusStep: false,
    };
  }

  return {
    step1Complete: storedPreferred != null,
    step2Complete: importComplete,
    step3Complete: introComplete,
    preferredWorkspace: storedPreferred,
    primaryWorkspace: storedPrimary,
    hasFocusStep: true,
  };
}
