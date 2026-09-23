/** Shared pipeline / introduction list search helpers (case-insensitive substring). */

export const PIPELINE_SEARCH_MAX_LEN = 200;

export function normalizePipelineSearch(
  raw?: string | null
): string | undefined {
  if (raw == null || typeof raw !== "string") {
    return undefined;
  }
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  return t.slice(0, PIPELINE_SEARCH_MAX_LEN);
}

export function matchesPipelineSearch(
  haystack: string,
  needle: string
): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function pushParts(parts: string[], values: (string | null | undefined)[]) {
  for (const v of values) {
    if (v != null && String(v).trim() !== "") {
      parts.push(String(v).trim());
    }
  }
}

/** Requester-side: meeting + prospect (contact) + connector (contactOwner). */
export function requesterIntroductionSearchHaystack(req: AnyType): string {
  const parts: string[] = [];
  pushParts(parts, [
    req.meetingTitle,
    req.meetingDescription,
    req.additionalContext,
    req.contactName,
    req.requesterArchiveReason,
    req.requesterArchiveNotes,
  ]);
  const c = req.contact;
  if (c) {
    pushParts(parts, [c.firstName, c.lastName, c.email, c.fullName]);
    if (c.firstName && c.lastName) {
      parts.push(`${c.firstName} ${c.lastName}`);
    }
  }
  const co = req.contactOwner;
  if (co) {
    pushParts(parts, [co.fullName, co.firstName, co.lastName, co.email]);
    if (co.firstName && co.lastName) {
      parts.push(`${co.firstName} ${co.lastName}`);
    }
  }
  return parts.join(" ");
}

/** Connector-side: meeting + requester + prospect (contact). */
export function connectorIntroductionSearchHaystack(req: AnyType): string {
  const parts: string[] = [];
  pushParts(parts, [
    req.meetingTitle,
    req.meetingDescription,
    req.additionalContext,
    req.contactName,
    req.requesterArchiveReason,
    req.requesterArchiveNotes,
  ]);
  const r = req.requester;
  if (r) {
    pushParts(parts, [r.fullName, r.firstName, r.lastName, r.email]);
    if (r.firstName && r.lastName) {
      parts.push(`${r.firstName} ${r.lastName}`);
    }
  }
  const c = req.contact;
  if (c) {
    pushParts(parts, [c.firstName, c.lastName, c.email, c.fullName]);
    if (c.firstName && c.lastName) {
      parts.push(`${c.firstName} ${c.lastName}`);
    }
  }
  return parts.join(" ");
}

export function filterByPipelineSearch<T extends AnyType>(
  items: T[],
  searchRaw: string | undefined,
  haystackFn: (item: T) => string
): T[] {
  const needle = normalizePipelineSearch(searchRaw);
  if (!needle) {
    return items;
  }
  return items.filter((item) =>
    matchesPipelineSearch(haystackFn(item), needle)
  );
}

export function unfulfilledIntroductionSearchHaystack(item: AnyType): string {
  const parts: string[] = [];
  pushParts(parts, [
    item.meetingTitle,
    item.meetingDescription,
    item.targetName,
    item.requesterName,
  ]);
  return parts.join(" ");
}
