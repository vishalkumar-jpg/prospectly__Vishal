const CHIP_STATUSES = new Set(["ok", "partial", "gap"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isChipStatus(value: unknown): value is "ok" | "partial" | "gap" {
  return typeof value === "string" && CHIP_STATUSES.has(value);
}

function isPercent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    !Number.isNaN(value) &&
    value >= 0 &&
    value <= 100
  );
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function isOptionalPercent(value: unknown): boolean {
  return value === undefined || isPercent(value);
}

function isValidChip(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const chip = value as Record<string, unknown>;
  return isNonEmptyString(chip.label) && isChipStatus(chip.status);
}

function isValidVsSide(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const side = value as Record<string, unknown>;
  if (!isNonEmptyString(side.kicker) || !isNonEmptyString(side.title)) {
    return false;
  }
  if ("subtitle" in side && !isOptionalString(side.subtitle)) return false;
  if ("isRequirement" in side && !isOptionalBoolean(side.isRequirement)) {
    return false;
  }
  return true;
}

function isValidExperienceBar(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const bar = value as Record<string, unknown>;
  return (
    isNonEmptyString(bar.label) &&
    isNonEmptyString(bar.value) &&
    isChipStatus(bar.valueStatus) &&
    isPercent(bar.fillPercent) &&
    isChipStatus(bar.fillStatus) &&
    isOptionalPercent(bar.reqMarkPercent)
  );
}

function sanitizeVsSide(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const side = value as Record<string, unknown>;
  if (!isNonEmptyString(side.kicker) || !isNonEmptyString(side.title)) {
    return undefined;
  }
  const result: Record<string, unknown> = {
    kicker: side.kicker,
    title: side.title,
  };
  if (typeof side.subtitle === "string") {
    result.subtitle = side.subtitle;
  }
  if (typeof side.isRequirement === "boolean") {
    result.isRequirement = side.isRequirement;
  }
  return result;
}

function sanitizeExperienceBar(
  value: unknown
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const bar = value as Record<string, unknown>;
  if (
    !isNonEmptyString(bar.label) ||
    !isNonEmptyString(bar.value) ||
    !isChipStatus(bar.valueStatus) ||
    !isPercent(bar.fillPercent) ||
    !isChipStatus(bar.fillStatus)
  ) {
    return undefined;
  }
  const result: Record<string, unknown> = {
    label: bar.label,
    value: bar.value,
    valueStatus: bar.valueStatus,
    fillPercent: bar.fillPercent,
    fillStatus: bar.fillStatus,
  };
  if (isPercent(bar.reqMarkPercent)) {
    result.reqMarkPercent = bar.reqMarkPercent;
  }
  return result;
}

function sanitizeDetailOptionals(detail: unknown): unknown | undefined {
  if (!detail || typeof detail !== "object") return undefined;
  const d = detail as Record<string, unknown>;

  if (d.type === "experience") {
    if (!Array.isArray(d.bars)) return undefined;
    const bars = d.bars
      .map(sanitizeExperienceBar)
      .filter((bar): bar is Record<string, unknown> => bar !== undefined);
    if (bars.length === 0) return undefined;

    const result: Record<string, unknown> = { type: "experience", bars };
    if (typeof d.note === "string") {
      result.note = d.note;
    }
    return result;
  }

  if (d.type === "vs") {
    const left = sanitizeVsSide(d.left);
    const right = sanitizeVsSide(d.right);
    if (!left || !right || !isChipStatus(d.compareStatus)) return undefined;

    const result: Record<string, unknown> = {
      type: "vs",
      left,
      right,
      compareStatus: d.compareStatus,
    };
    if (Array.isArray(d.facts)) {
      const facts = d.facts.filter(isValidChip);
      if (facts.length > 0) {
        result.facts = facts;
      }
    }
    return result;
  }

  if (d.type === "facts") {
    return detail;
  }

  return undefined;
}

function chipLabelKey(label: string): string {
  return label.trim().toLowerCase();
}

function collectChipLabelKeys(chips: unknown): Set<string> {
  const keys = new Set<string>();
  if (!Array.isArray(chips)) return keys;
  for (const chip of chips) {
    if (!chip || typeof chip !== "object") continue;
    const { label } = chip as { label?: unknown };
    if (typeof label === "string" && label.trim()) {
      keys.add(chipLabelKey(label));
    }
  }
  return keys;
}

function filterDuplicateFacts(
  facts: unknown,
  existingLabels: Set<string>
): unknown[] | undefined {
  if (!Array.isArray(facts)) return undefined;
  const filtered = facts.filter((chip) => {
    if (!isValidChip(chip)) return false;
    return !existingLabels.has(chipLabelKey(chip.label));
  });
  return filtered;
}

function dedupeDimensionDetail(
  detail: unknown,
  existingLabels: Set<string>
): unknown | undefined {
  if (!detail || typeof detail !== "object") return undefined;
  const d = detail as Record<string, unknown>;

  if (d.type === "facts") {
    const facts = filterDuplicateFacts(d.facts, existingLabels);
    if (!facts || facts.length === 0) return undefined;
    return { ...d, facts };
  }

  if (d.type === "vs") {
    if ("facts" in d && !Array.isArray(d.facts)) {
      const { facts: _facts, ...withoutFacts } = d;
      return withoutFacts;
    }
    if (Array.isArray(d.facts)) {
      const facts = filterDuplicateFacts(d.facts, existingLabels);
      if (!facts || facts.length === 0) {
        const { facts: _facts, ...withoutFacts } = d;
        return withoutFacts;
      }
      return { ...d, facts };
    }
    return detail;
  }

  return detail;
}

function dedupeDimensionChips(dimension: unknown): unknown {
  if (!dimension || typeof dimension !== "object") return dimension;
  const dim = dimension as Record<string, unknown>;
  const existingLabels = new Set<string>([
    ...collectChipLabelKeys(dim.matched),
    ...collectChipLabelKeys(dim.gaps),
  ]);

  if (!("detail" in dim)) return dimension;

  const dedupedDetail = dedupeDimensionDetail(dim.detail, existingLabels);
  if (!dedupedDetail) {
    const { detail: _detail, ...withoutDetail } = dim;
    return withoutDetail;
  }

  return { ...dim, detail: dedupedDetail };
}

function isCompleteDetail(detail: unknown): boolean {
  if (!detail || typeof detail !== "object") return false;
  const d = detail as Record<string, unknown>;

  if (d.type === "experience") {
    if ("note" in d && !isOptionalString(d.note)) return false;
    return (
      Array.isArray(d.bars) &&
      d.bars.length > 0 &&
      d.bars.every(isValidExperienceBar)
    );
  }

  if (d.type === "vs") {
    if (
      "facts" in d &&
      (!Array.isArray(d.facts) || !d.facts.every(isValidChip))
    ) {
      return false;
    }
    return (
      isValidVsSide(d.left) &&
      isValidVsSide(d.right) &&
      isChipStatus(d.compareStatus)
    );
  }

  if (d.type === "facts") {
    return (
      Array.isArray(d.facts) && d.facts.length > 0 && d.facts.every(isValidChip)
    );
  }

  return false;
}

export function sanitizeGapAnalysisResponse(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  const root = data as Record<string, unknown>;
  if (!Array.isArray(root.dimensions)) return data;

  const dimensions = root.dimensions.map((dimension) => {
    const deduped = dedupeDimensionChips(dimension);
    if (!deduped || typeof deduped !== "object") return deduped;

    const dim = deduped as Record<string, unknown>;
    if (!("detail" in dim)) return deduped;

    const sanitizedDetail = sanitizeDetailOptionals(dim.detail);
    if (!sanitizedDetail || !isCompleteDetail(sanitizedDetail)) {
      const { detail: _detail, ...withoutDetail } = dim;
      return withoutDetail;
    }

    return { ...dim, detail: sanitizedDetail };
  });

  return { ...root, dimensions };
}
