import { sql } from "drizzle-orm";
import {
  PAYOUT_COUNTRY_CONFIG,
  SUPPORTED_PAYOUT_COUNTRIES,
  type PayoutCountryCode,
} from "config/payment.config";
import type { FacetValue } from "../candidate-search.response";
import { buildCountryFacetCountSelect } from "../criteria/candidate-search-country-location";

type CountryCountRow = Record<
  `country_${Lowercase<PayoutCountryCode>}`,
  number
>;

/** Distinct in-scope candidates counted by location / CRM country (not job countries). */
export async function loadCandidateCountryFacets(
  db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
  jobIds: string[]
): Promise<FacetValue[]> {
  if (jobIds.length === 0) return [];

  const jobIdsArray = sql`ARRAY[${sql.join(
    jobIds.map((id) => sql`${id}::uuid`),
    sql`, `
  )}]`;

  const result = await db.execute(sql`
    WITH scoped AS (
      SELECT DISTINCT ON (
        coalesce('c:' || jc.contact_id::text, 'u:' || jc.candidate_user_id::text)
      )
        coalesce(nullif(cr.metadata->>'location', ''),
                 nullif(concat_ws(', ', ct.city, ct.state), '')) AS location,
        ct.country AS contact_country
      FROM prospectly.recruitment_job_candidates jc
      JOIN prospectly.recruitment_jobs j
        ON j.id = jc.job_id
       AND j.deleted_at IS NULL
      LEFT JOIN prospectly.contacts ct
        ON ct.id = jc.contact_id
       AND ct.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT r.metadata
        FROM prospectly.contact_resumes r
        WHERE (
                r.candidate_id = jc.id
                OR (r.candidate_id IS NULL AND r.contact_id = jc.contact_id)
              )
          AND r.deleted_at IS NULL
        ORDER BY r.updated_at DESC
        LIMIT 1
      ) cr ON TRUE
      WHERE jc.job_id = ANY(${jobIdsArray})
        AND jc.deleted_at IS NULL
        AND (jc.contact_id IS NOT NULL OR jc.candidate_user_id IS NOT NULL)
      ORDER BY
        coalesce('c:' || jc.contact_id::text, 'u:' || jc.candidate_user_id::text),
        jc.updated_at DESC
    )
    SELECT ${buildCountryFacetCountSelect()} FROM scoped
  `);

  const raw = Array.isArray(result)
    ? (result as Array<Record<string, unknown>>)
    : ((result as { rows?: Array<Record<string, unknown>> }).rows ?? []);
  const row = raw[0] as CountryCountRow | undefined;

  return SUPPORTED_PAYOUT_COUNTRIES.map((code) => ({
    value: code,
    label: PAYOUT_COUNTRY_CONFIG[code]?.name ?? code,
    count: row?.[`country_${code.toLowerCase()}` as keyof CountryCountRow] ?? 0,
  }));
}
