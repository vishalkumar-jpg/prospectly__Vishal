import { toUTC } from "utils/dayjs";
import type {
  ContactListSortBy,
  ContactListSortDir,
} from "./contacts.constants";

/** Minimal row shape from getContactsByUserId / searchContactsInternal */
export type ContactListSortableRow = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
  linkedin?: string | null;
  bountyAmount?: string | number | null;
  source?: string | string[] | null;
  updatedAt?: Date | string | null;
};

/** Trim + lowercase; null/undefined/whitespace-only → "" */
function normalizeTextForSort(value: string | null | undefined): string {
  if (value == null) {
    return "";
  }
  return String(value).trim().toLowerCase();
}

/**
 * Lexicographic sort on normalized strings. Empty sorts before non-empty in
 * ASC (blanks first), and after non-empty in DESC — so the row with data moves
 * between top and bottom when toggling direction.
 */
function compareTextSort(a: string, b: string, asc: boolean): number {
  const cmp = a.localeCompare(b, undefined, {
    sensitivity: "base",
    numeric: true,
  });
  return asc ? cmp : -cmp;
}

function contactName(row: ContactListSortableRow): string {
  return normalizeTextForSort(
    `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim()
  );
}

function sourceKey(row: ContactListSortableRow): string {
  const s = row.source;
  if (!s) {
    return "";
  }
  if (Array.isArray(s)) {
    return [...s]
      .map((x) => normalizeTextForSort(x))
      .filter(Boolean)
      .sort((x, y) => x.localeCompare(y, undefined, { sensitivity: "base" }))
      .join(",");
  }
  return normalizeTextForSort(String(s));
}

function bountyNum(row: ContactListSortableRow): number {
  const v = row.bountyAmount;
  if (v == null || v === "") {
    return Number.NEGATIVE_INFINITY;
  }
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
}

/**
 * Sorts contacts in place. Default: updatedAt DESC. asc/desc: sort by sortBy.
 */
export function sortContactsForList(
  rows: ContactListSortableRow[],
  sortBy?: ContactListSortBy,
  sortDir?: ContactListSortDir
): void {
  const useDefault =
    !sortDir ||
    sortDir === "default" ||
    !sortBy ||
    (sortDir !== "asc" && sortDir !== "desc");

  const primary: ContactListSortBy = useDefault ? "updatedAt" : sortBy;
  const asc = useDefault ? false : sortDir === "asc";

  rows.sort((a, b) => {
    let cmp = 0;
    switch (primary) {
      case "contact":
        cmp = compareTextSort(contactName(a), contactName(b), asc);
        break;
      case "email":
        cmp = compareTextSort(
          normalizeTextForSort(a.email),
          normalizeTextForSort(b.email),
          asc
        );
        break;
      case "company":
        cmp = compareTextSort(
          normalizeTextForSort(a.company),
          normalizeTextForSort(b.company),
          asc
        );
        break;
      case "linkedin":
        cmp = compareTextSort(
          normalizeTextForSort(a.linkedin),
          normalizeTextForSort(b.linkedin),
          asc
        );
        break;
      case "bountyAmount": {
        const na = bountyNum(a);
        const nb = bountyNum(b);
        cmp = asc ? na - nb : nb - na;
        break;
      }
      case "source":
        cmp = compareTextSort(sourceKey(a), sourceKey(b), asc);
        break;
      case "updatedAt": {
        const ta = a.updatedAt ? toUTC(a.updatedAt).valueOf() : 0;
        const tb = b.updatedAt ? toUTC(b.updatedAt).valueOf() : 0;
        cmp = asc ? ta - tb : tb - ta;
        break;
      }
    }
    if (cmp !== 0) {
      return cmp;
    }
    return a.id - b.id;
  });
}
