/** Maps credit `provider` (from /credits/rules) to trust rule slug (GET /trust-score/me/rules). */
export const CREDIT_PROVIDER_TO_TRUST_SLUG: Record<string, string> = {
  google: "google_contact_import",
  microsoft: "microsoft_contact_import",
  apple: "apple_contact_import",
};

export type TrustRuleSlugEntry = {
  slug: string;
  points: number;
  configParams?: Record<string, unknown>;
};

export type TrustMyRulesDataMinimal = {
  earned: TrustRuleSlugEntry[];
  pending: TrustRuleSlugEntry[];
};

export type TrustPointsInfoForSlug = {
  points: number | null;
  isEarned: boolean;
  configParams?: Record<string, unknown>;
};

export function getTrustPointsInfoForSlug(
  trustRulesData: TrustMyRulesDataMinimal | undefined,
  slug: string
): TrustPointsInfoForSlug {
  if (!trustRulesData || !slug) {
    return { points: null, isEarned: false };
  }

  const earnedRule = trustRulesData.earned.find((r) => r.slug === slug);
  if (earnedRule) {
    return {
      points: earnedRule.points,
      isEarned: true,
      configParams: earnedRule.configParams,
    };
  }

  const pendingRule = trustRulesData.pending.find((r) => r.slug === slug);
  if (pendingRule) {
    return {
      points: pendingRule.points,
      isEarned: false,
      configParams: pendingRule.configParams,
    };
  }

  return { points: null, isEarned: false };
}

/** Large hero value for import modals — trust points only, not dollars. */
export function formatTrustModalHeroAmount(info: TrustPointsInfoForSlug): string {
  if (info.points == null) {
    return "—";
  }
  return `${info.points.toFixed(1)}`;
}

/** Primary label under hero — trust API only. */
export function formatTrustModalHeroLabel(info: TrustPointsInfoForSlug): string {
  if (info.points == null) {
    return "Trust Score Points";
  }
  if (info.isEarned) {
    return "Trust Score Points earned";
  }
  const minRaw = info.configParams?.min_contacts;
  if (minRaw != null) {
    const n = Number(minRaw);
    if (Number.isFinite(n) && Number.isInteger(n) && n > 0) {
      const contactWord = n === 1 ? "contact" : "contacts";
      return `Import ${n} ${contactWord} → Earn ${info.points.toFixed(1)} Trust Score Points`;
    }
  }
  return "Earn Trust Score Points";
}
