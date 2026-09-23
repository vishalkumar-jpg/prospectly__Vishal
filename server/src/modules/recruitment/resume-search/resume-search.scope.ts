/**
 * Who is searching, and therefore which rows exist as far as this query is
 * concerned.
 *
 * Deliberately a required argument rather than an optional narrowing: the
 * `job` scope reads every candidate on the job, so if it were the default an
 * omitted scope would silently become a cross-connector data leak instead of a
 * compile error.
 */
export type ResumeSearchScope =
  | {
      /** The job's owner or a collaborator: the whole pipeline. */
      kind: "job";
      jobId: string;
    }
  | {
      /**
       * A connector: only the rows they are attached to on this job — their
       * referred candidates, and their own pool matches, which have no
       * candidate record yet and are reached through the contact instead.
       */
      kind: "connector";
      jobId: string;
      connectorUserId: string;
    }
  | {
      /**
       * Cross-job candidate search (ADR-005): every posting this user can
       * access, resolved once by `candidate-search-scope.service.ts`.
       *
       * `jobIds` is passed in, never derived inside the SQL. The resolution
       * needs a permission join (`candidate.view`) and an empty set must short
       * -circuit rather than emit `IN ()`, so the security check lives in one
       * auditable place instead of buried in a query template.
       */
      kind: "workspace";
      userId: string;
      jobIds: string[];
    };

/** Which table a result row came from. Both id spaces are uuid, but the client
 *  should not have to infer the kind from that. */
export type ResumeSearchRowKind = "candidate" | "pool_match";

/**
 * Log-safe identifier for whichever scope is in play. Workspace scope has no
 * single `jobId`, and its id list can run to hundreds — logging the count keeps
 * the line useful without dumping the set into an error log.
 */
export function describeScopeTarget(scope: ResumeSearchScope): string {
  return scope.kind === "workspace"
    ? `jobIds=${scope.jobIds.length}`
    : `jobId=${scope.jobId}`;
}
