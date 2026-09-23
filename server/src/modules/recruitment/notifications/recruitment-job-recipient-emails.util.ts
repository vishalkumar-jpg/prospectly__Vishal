import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { COLLABORATOR_STATUS } from "modules/recruitment/collaboration/recruitment-collaboration.constants";
import { resolveUserEmail } from "./processors/recruitment-lifecycle-send.helper";

export type OwnerAndCollaboratorEmails = {
  to: string;
  cc: string[];
};

export async function resolveOwnerAndCollaboratorEmails(
  db: PostgresJsDatabase<typeof schema>,
  jobId: string,
  requesterId: string
): Promise<OwnerAndCollaboratorEmails | null> {
  const ownerEmail = await resolveUserEmail(db, requesterId);
  if (!ownerEmail) {
    return null;
  }

  const collaborators = await db
    .select({
      collaboratorUserId: schema.recruitmentJobCollaborators.collaboratorUserId,
    })
    .from(schema.recruitmentJobCollaborators)
    .where(
      and(
        eq(schema.recruitmentJobCollaborators.jobId, jobId),
        eq(
          schema.recruitmentJobCollaborators.status,
          COLLABORATOR_STATUS.ACTIVE
        ),
        isNull(schema.recruitmentJobCollaborators.deletedAt)
      )
    );

  const cc: string[] = [];
  const seen = new Set<string>([ownerEmail.toLowerCase()]);

  for (const collaborator of collaborators) {
    if (collaborator.collaboratorUserId === requesterId) {
      continue;
    }
    const email = await resolveUserEmail(db, collaborator.collaboratorUserId);
    if (!email) {
      continue;
    }
    const key = email.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    cc.push(email);
  }

  return { to: ownerEmail, cc };
}
