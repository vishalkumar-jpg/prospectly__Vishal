import type {
  ResumeSearchConditionState,
  ResumeSearchMatch,
  ResumeSearchMatchKind,
} from "@/lib/api/recruitment";

/**
 * One piece of evidence for why a candidate is in the results — either a stated
 * requirement and whether they meet it, or a term their resume matched on.
 */
export type RelevanceItem =
  | { kind: "condition"; label: string; state: ResumeSearchConditionState }
  | { kind: "term"; label: string; termKind: ResumeSearchMatchKind };

export interface RelevanceStrip {
  visible: RelevanceItem[];
  /** Everything that did not fit, for the "+N" panel. */
  hidden: RelevanceItem[];
  /**
   * Whether the "Partial" badge renders. Decided here because it occupies part
   * of the first line and so changes how much evidence fits beside it.
   */
  showPartial: boolean;
}

/**
 * Unmet first. With only a slot or two on a kanban card, what a candidate is
 * missing is worth more than what they have — and it keeps a ✗ on the card
 * whenever one exists, so the "Partial" badge always has its evidence beside it.
 */
const STATE_PRIORITY: Record<ResumeSearchConditionState, number> = {
  missing: 0,
  unknown: 1,
  met: 2,
};

/**
 * The strip is packed by width rather than by a chip count, so a line that is
 * going to exist anyway gets filled instead of ending in a big "+5".
 *
 * Widths are estimated, not measured: the kanban column is a fixed 340px, so
 * there is nothing responsive to react to and a layout pass would only add a
 * measure-then-reflow flicker. The estimate is deliberately generous, and the
 * container still wraps, so being wrong under-fills a line rather than
 * overflowing the card.
 */
const CARD_CONTENT_WIDTH = 286; // 340px column, less column and card padding
const MAX_LINES = 2;
const CHIP_GAP = 4; // gap-1
const CHIP_CHROME = 22; // px-2.5 plus a 1px border either side
const CHIP_CHAR = 5.6; // average glyph at text-[10px], rounded up
const CHIP_ICON = 14; // the ✓/✗/? glyph plus its gap-0.5
const TIER_WIDTH = 99; // sparkles + "#12 RELATED" at uppercase tracking-wider
const PARTIAL_WIDTH = 58;
const OVERFLOW_WIDTH = 36; // "+12"

function chipWidth(item: RelevanceItem): number {
  const icon = item.kind === "condition" ? CHIP_ICON : 0;
  return Math.ceil(item.label.length * CHIP_CHAR) + icon + CHIP_CHROME;
}

/** `base` is what the line already carries; 0 means the line is still empty. */
function lineWidth(items: RelevanceItem[], base: number): number {
  return items.reduce(
    (used, item) =>
      used === 0 ? chipWidth(item) : used + CHIP_GAP + chipWidth(item),
    base
  );
}

/**
 * Fills at most two lines, then walks back far enough to seat the "+N" chip if
 * anything was left over.
 *
 * Items are taken in priority order but an item too wide for what remains of a
 * line is skipped rather than ending it — otherwise the "Partial" badge leaves
 * a 120px hole on the first line whenever the strongest requirement happens to
 * have a long label. Priority still decides what is *shown*; it only stops
 * dictating which of the two lines something lands on.
 */
function packLines(
  items: RelevanceItem[],
  leading: number
): { visible: RelevanceItem[]; hidden: RelevanceItem[] } {
  const order = new Map(items.map((item, index) => [item, index]));
  const remaining = [...items];
  const lines: RelevanceItem[][] = [];
  const bases: number[] = [];

  for (let li = 0; li < MAX_LINES && remaining.length > 0; li += 1) {
    const base = li === 0 ? leading : 0;
    const line: RelevanceItem[] = [];
    let used = base;

    for (let i = 0; i < remaining.length; ) {
      const width = chipWidth(remaining[i]);
      const next = used === 0 ? width : used + CHIP_GAP + width;

      if (next <= CARD_CONTENT_WIDTH) {
        used = next;
        line.push(remaining[i]);
        remaining.splice(i, 1);
      } else {
        i += 1;
      }
    }

    lines.push(line);
    bases.push(base);
  }

  const hidden = remaining;

  while (hidden.length > 0) {
    const last = lines.length - 1;
    const used = lineWidth(lines[last], bases[last]);
    if (used + CHIP_GAP + OVERFLOW_WIDTH <= CARD_CONTENT_WIDTH) break;

    const popped = lines[last].pop();
    if (popped) {
      hidden.push(popped);
      continue;
    }
    // The line emptied and "+N" still does not fit: it belongs on the one above.
    if (lines.length === 1) break;
    lines.pop();
    bases.pop();
  }

  // Popping to seat "+N" usually frees more room than "+N" takes, so top the
  // line back up with whatever still fits beside it.
  if (hidden.length > 0) {
    const last = lines.length - 1;
    for (let i = 0; i < hidden.length; ) {
      const used = lineWidth(lines[last], bases[last]);
      const width = chipWidth(hidden[i]);
      const next = used === 0 ? width : used + CHIP_GAP + width;

      if (next + CHIP_GAP + OVERFLOW_WIDTH <= CARD_CONTENT_WIDTH) {
        lines[last].push(hidden[i]);
        hidden.splice(i, 1);
      } else {
        i += 1;
      }
    }
  }

  // The panel reads best in the order the items were ranked, not the order the
  // packer happened to displace them in.
  hidden.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

  return { visible: lines.flat(), hidden };
}

/**
 * Folds the spellings a requirement and a matched term can differ by —
 * "Vue.js", "vue js" and "vuejs" are one thing. Punctuation that carries
 * meaning is left alone, so "C#" does not collapse into "C".
 */
function foldLabel(value: string): string {
  return value.toLowerCase().replace(/[\s._-]+/g, "");
}

/**
 * Decides what the card's relevance strip shows.
 *
 * The important part is the dedupe: a met requirement and a matched keyword are
 * routinely the same word, and rendering both — "✓ Terraform" above a plain
 * "Terraform" — states one fact twice in two colours.
 */
export function buildRelevanceStrip(match: ResumeSearchMatch): RelevanceStrip {
  // Stable sort, so the order the requirements were stated in survives within
  // each state group.
  const conditions = [...match.conditions].sort(
    (a, b) => STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state]
  );

  const stated = new Set(conditions.map((c) => foldLabel(c.label)));

  const items: RelevanceItem[] = [
    ...conditions.map(
      (c): RelevanceItem => ({
        kind: "condition",
        label: c.label,
        state: c.state,
      })
    ),
    ...match.matchedOn
      .filter((term) => !stated.has(foldLabel(term.term)))
      .map(
        (term): RelevanceItem => ({
          kind: "term",
          label: term.term,
          termKind: term.kind,
        })
      ),
  ];

  const showPartial = match.conditions.length > 0 && !match.allConditionsMet;
  const leading = TIER_WIDTH + (showPartial ? CHIP_GAP + PARTIAL_WIDTH : 0);

  return { showPartial, ...packLines(items, leading) };
}
