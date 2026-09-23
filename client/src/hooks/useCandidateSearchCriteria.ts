import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  CANDIDATE_SEARCH_PAGE_SIZES,
  PAGE_SIZE_STORAGE_KEY,
  blankCriteria,
  clearFilters,
  cloneCriteria,
  countActiveFilterGroups,
  countAppliedCriteria,
  decodeCriteria,
  encodeCriteria,
  syncSortForCriteriaChange,
  type CandidateSearchCriteria,
  type CandidateSearchSort,
  clearOrigin,
} from "@/lib/recruitment/candidate-search.criteria";

type StringArrayField =
  | "jobIds"
  | "titles"
  | "skills"
  | "companies"
  | "countries"
  | "employmentTypes"
  | "workModes"
  | "educationLevels"
  | "sources";

type NumberArrayField = "industryIds" | "stageIds";

/** Criteria whose "off" value is null — a chip removes them by nulling them. */
type NullableField =
  | "query"
  | "location"
  | "appliedFrom"
  | "appliedTo"
  | "experienceMin"
  | "experienceMax"
  | "scoreMin"
  | "scoreMax";

export type CandidateSearchChipField =
  | StringArrayField
  | NumberArrayField
  | NullableField;

/** `experienceMin` is here because the "5+ yrs" quick filter toggles a scalar. */
export type QuickFilterField =
  | StringArrayField
  | NumberArrayField
  | "experienceMin";

const NUMBER_ARRAY_FIELDS: readonly string[] = ["industryIds", "stageIds"];
const STRING_ARRAY_FIELDS: readonly string[] = [
  "jobIds",
  "titles",
  "skills",
  "companies",
  "countries",
  "employmentTypes",
  "workModes",
  "educationLevels",
  "sources",
];

/** Range bounds set outright — a `<select>` picks a value, it does not toggle. */
type RangeFields = Pick<
  CandidateSearchCriteria,
  "scoreMin" | "scoreMax" | "experienceMin" | "experienceMax"
>;

const isNumberArrayField = (field: string): field is NumberArrayField =>
  NUMBER_ARRAY_FIELDS.includes(field);

const isArrayField = (
  field: string
): field is StringArrayField | NumberArrayField =>
  STRING_ARRAY_FIELDS.includes(field) || NUMBER_ARRAY_FIELDS.includes(field);

/**
 * Rows-per-page is a per-user preference, not part of a shared search, so it
 * survives in localStorage. Storage throws outright in private-mode Safari and
 * whenever site data is blocked, and a lost preference must never take the page
 * down with it — hence the try/catch on both ends.
 */
function readStoredPageSize(): number | null {
  try {
    const size = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    const allowed: readonly number[] = CANDIDATE_SEARCH_PAGE_SIZES;
    return allowed.includes(size) ? size : null;
  } catch {
    return null;
  }
}

/**
 * The draft/applied state machine (§9.2).
 *
 * Applied lives in the URL — shareable, refresh-proof, Back works. Draft lives
 * in local state and is a *copy* of applied: if the two shared a reference,
 * every keystroke in the drawer would silently move the results, which is the
 * one thing this pattern exists to prevent.
 */
export function useCandidateSearchCriteria() {
  const [searchParams, setSearchParams] = useSearchParams();

  const storedPageSize = useRef<number | null | undefined>(undefined);
  if (storedPageSize.current === undefined) {
    storedPageSize.current = readStoredPageSize();
  }

  const decodeApplied = useCallback((params: URLSearchParams) => {
    const criteria = decodeCriteria(params);
    // A URL without an explicit pageSize is not a request for the default — it
    // is a URL that says nothing, so the user's own preference fills the gap.
    if (!params.has("pageSize") && storedPageSize.current != null) {
      criteria.pageSize = storedPageSize.current;
    }
    return criteria;
  }, []);

  const applied = useMemo(
    () => decodeApplied(searchParams),
    [decodeApplied, searchParams]
  );

  /**
   * Every write goes through the functional form of `setSearchParams` and
   * re-decodes what is actually in the URL. Reading `applied` from the closure
   * instead would lose one of two updates dispatched in the same tick — a blur
   * that submits the query and a click that toggles a quick filter are exactly
   * that, and React batches them.
   */
  const update = useCallback(
    (mutate: (next: CandidateSearchCriteria) => void) => {
      setSearchParams((prev) => {
        const next = decodeApplied(prev);
        const beforeCount = countAppliedCriteria(next);
        mutate(next);
        syncSortForCriteriaChange(
          beforeCount,
          countAppliedCriteria(next),
          next
        );
        // Any change to applied resets paging: page 7 of the old result set is
        // not page 7 of the new one.
        next.page = 1;
        return encodeCriteria(next);
      });
    },
    [decodeApplied, setSearchParams]
  );

  // ---------------------------------------------------------------- drawer --

  const appliedRef = useRef(applied);
  appliedRef.current = applied;

  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<CandidateSearchCriteria>(() =>
    cloneCriteria(applied)
  );

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  /** Closing discards the draft — the next open re-seeds it from applied. */
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  /**
   * Seed the draft on open, after the batch that opened it has been committed:
   * clicking "All filters" blurs the search box first, and that blur may submit
   * a pending query. Seeding inside `openDrawer` would copy the pre-blur
   * criteria and the following commit would erase the query the user just ran.
   * Layout effect so the drawer never paints the previous draft.
   */
  useLayoutEffect(() => {
    if (isDrawerOpen) setDraft(cloneCriteria(appliedRef.current));
  }, [isDrawerOpen]);

  const commitDraft = useCallback(() => {
    setSearchParams((prev) => {
      const current = decodeApplied(prev);
      const beforeCount = countAppliedCriteria(current);
      const next = cloneCriteria(draft);
      // The drawer owns filters only. Query, sort and page size are edited by
      // controls outside it, so their live values win over the open-time copy.
      next.query = current.query;
      next.sort = current.sort;
      next.sortDir = current.sortDir;
      next.pageSize = current.pageSize;
      syncSortForCriteriaChange(beforeCount, countAppliedCriteria(next), next);
      next.page = 1;
      return encodeCriteria(next);
    });
    setDrawerOpen(false);
  }, [decodeApplied, draft, setSearchParams]);

  /**
   * Footer "Clear" and header "Reset all" are one behaviour, not two: same
   * handler, draft only, results untouched until commit. `clearFilters` keeps
   * the query because the box that owns it lives outside the drawer.
   */
  const clearDraft = useCallback(() => {
    setDraft((prev) => clearFilters(prev));
  }, []);

  // ----------------------------------------------------------- free text ----

  const [pendingQuery, setPendingQuery] = useState(applied.query ?? "");
  const lastSubmittedQuery = useRef(applied.query ?? "");

  const applyQuery = useCallback(
    (normalized: string) => {
      // The same normalised string is never submitted twice in a row, so a
      // double-click on Search costs one search and one embedding bill.
      if (normalized === lastSubmittedQuery.current) return;
      lastSubmittedQuery.current = normalized;
      update((next) => {
        next.query = normalized || null;
      });
    },
    [update]
  );

  const setQuery = useCallback((value: string) => setPendingQuery(value), []);

  /**
   * The only way free text reaches the results — Search, or Enter.
   *
   * Typing deliberately does not search. An idle timer used to apply the query
   * on its own, which made the Search button decorative and every keystroke a
   * potential embedding call; the recruiter now decides when the query is
   * finished. Facets still apply on change, because one click is the whole
   * interaction there and there is nothing half-typed to wait for.
   */
  const submitQuery = useCallback(
    () => applyQuery(pendingQuery.trim()),
    [applyQuery, pendingQuery]
  );

  useEffect(() => {
    const next = applied.query ?? "";
    if (next === lastSubmittedQuery.current) return;
    // Applied moved without the box: Back/Forward, a removed query chip, Clear
    // all. The input must show what the results on screen actually answer.
    lastSubmittedQuery.current = next;
    setPendingQuery(next);
  }, [applied.query]);

  // ------------------------------------------------- immediate applied ------

  /** Quick filters write to the same fields the drawer edits (§7.1). */
  const toggleQuickFilter = useCallback(
    (field: QuickFilterField, value: string | number) => {
      update((next) => {
        if (field === "experienceMin") {
          const years = Number(value);
          next.experienceMin = next.experienceMin === years ? null : years;
          return;
        }
        if (isNumberArrayField(field)) {
          const item = Number(value);
          next[field] = next[field].includes(item)
            ? next[field].filter((v) => v !== item)
            : [...next[field], item];
          return;
        }
        const item = String(value);
        next[field] = next[field].includes(item)
          ? next[field].filter((v) => v !== item)
          : [...next[field], item];
      });
    },
    [update]
  );

  /** `value` addresses one member of a multi-value facet; omit it for scalars. */
  const removeChip = useCallback(
    (field: CandidateSearchChipField, value?: string | number) => {
      update((next) => {
        if (!isArrayField(field)) {
          // "Off" for a scalar is whatever blankCriteria says it is — one
          // definition, and no per-field branch to keep in step with it.
          Object.assign(next, { [field]: blankCriteria()[field] });
          return;
        }
        if (value === undefined) return;
        if (isNumberArrayField(field)) {
          const item = Number(value);
          next[field] = next[field].filter((v) => v !== item);
          return;
        }
        const item = String(value);
        next[field] = next[field].filter((v) => v !== item);
      });
    },
    [update]
  );

  /**
   * Empties one facet. Distinct from removing a chip, which drops a single
   * value — this is the "All …" row, and an empty facet is how "every value"
   * is expressed.
   */
  const clearField = useCallback(
    (field: CandidateSearchChipField) => {
      update((next) => {
        const current = next[field];
        if (Array.isArray(current)) {
          (next[field] as unknown[]) = [];
        } else {
          (next[field] as null) = null;
        }
      });
    },
    [update]
  );

  const clearAll = useCallback(() => {
    update((next) => {
      const cleared = clearFilters(next);
      // Unlike the drawer's Clear, the chips row shows a chip for the query
      // too, so "Clear all" there has to clear it as well.
      cleared.query = null;
      Object.assign(next, cleared);
    });
  }, [update]);

  /**
   * Replaces applied criteria wholesale with a complete criteria object.
   *
   * `next` must carry every field — `Object.assign` overwrites only the keys it
   * is given, so a partial would leave the previous search's filters silently
   * ANDed onto the new one. This is what running a saved search does.
   */
  const applyCriteria = useCallback(
    (next: CandidateSearchCriteria) => {
      update((current) => Object.assign(current, cloneCriteria(next)));
    },
    [update]
  );

  const setRange = useCallback(
    (values: Partial<RangeFields>) => {
      update((next) => Object.assign(next, values));
    },
    [update]
  );

  /**
   * Commits a parsed job description. Applied directly rather than through the
   * drawer's draft: the sheet is its own committing surface, and routing it via
   * a draft the drawer also owns would let two open panels fight over one copy.
   */
  const commitJobDescription = applyCriteria;

  /**
   * Drops the description and every criterion it contributed — including
   * `bonus[]`, which has no chip and would otherwise keep scoring invisibly.
   */
  const removeJobDescription = useCallback(() => {
    update((next) => Object.assign(next, clearOrigin(next)));
  }, [update]);

  const setSort = useCallback(
    (sort: CandidateSearchSort, sortDir?: "asc" | "desc") => {
      update((next) => {
        next.sort = sort;
        if (sortDir) next.sortDir = sortDir;
      });
    },
    [update]
  );

  /** Column header: same column toggles asc/desc; a new column starts at desc. */
  const toggleSortColumn = useCallback(
    (sort: CandidateSearchSort) => {
      update((next) => {
        if (next.sort === sort) {
          next.sortDir = next.sortDir === "desc" ? "asc" : "desc";
        } else {
          next.sort = sort;
          next.sortDir = "desc";
        }
      });
    },
    [update]
  );

  const setPage = useCallback(
    (page: number) => {
      // The only applied change that does not reset paging — it *is* the paging.
      setSearchParams((prev) => {
        const next = decodeApplied(prev);
        next.page = Math.max(1, Math.floor(page));
        return encodeCriteria(next);
      });
    },
    [decodeApplied, setSearchParams]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      storedPageSize.current = pageSize;
      try {
        window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
      } catch {
        // Blocked storage: the preference is a nicety, never a blocker.
      }
      update((next) => {
        next.pageSize = pageSize;
      });
    },
    [update]
  );

  return {
    applied,
    draft,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    setDraft: setDraft as Dispatch<SetStateAction<CandidateSearchCriteria>>,
    commitDraft,
    clearDraft,
    /** Header "Reset all" — the same behaviour, deliberately the same function. */
    resetDraft: clearDraft,
    setQuery,
    submitQuery,
    pendingQuery,
    toggleQuickFilter,
    removeChip,
    clearAll,
    clearField,
    applyCriteria,
    setRange,
    commitJobDescription,
    removeJobDescription,
    setSort,
    toggleSortColumn,
    setPage,
    setPageSize,
    /** Every applied criterion, query included — drives the Match % column. */
    appliedCount: countAppliedCriteria(applied),
    /** Groups only, query excluded — drives the All-filters badge. */
    filterGroupCount: countActiveFilterGroups(applied),
  } as const;
}
