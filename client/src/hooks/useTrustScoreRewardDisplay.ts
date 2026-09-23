import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCreditInfoForProvider,
  formatConnectorCreditsDollars,
} from "@/lib/creditRulesUi";
import {
  CREDIT_PROVIDER_TO_TRUST_SLUG,
  formatTrustModalHeroAmount,
  formatTrustModalHeroLabel,
  getTrustPointsInfoForSlug,
} from "@/lib/trustRulesUi";

export type ImportModalCreditProvider = "google" | "microsoft" | "apple";

export type TrustScoreRewardTrustSlice = {
  amount: string;
  isEarned: boolean;
  minContacts: number | null;
  pointsValue: number | null;
};

export type TrustScoreRewardConnectorSlice = {
  dollarDisplay: string | null;
  isEarned: boolean;
  threshold: number | null;
  importedCount: number | undefined;
  creditsValue: number | null;
};

export type UseTrustScoreRewardDisplayResult = {
  amount: string;
  label: string;
  /** @deprecated Prefer trust + connector slices for new UI */
  connectorSecondary?: string;
  isLoading: boolean;
  trust: TrustScoreRewardTrustSlice;
  connector: TrustScoreRewardConnectorSlice;
};

function trustMinContactsFromParams(
  configParams: Record<string, unknown> | undefined
): number | null {
  const minRaw = configParams?.min_contacts;
  if (minRaw == null) return null;
  const n = Number(minRaw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Hero amount/label from GET /trust-score/me/rules (points via earned/pending by slug).
 * Connector slice from GET /credits/rules.
 */
export function useTrustScoreRewardDisplay(
  provider: ImportModalCreditProvider
): UseTrustScoreRewardDisplayResult {
  const { user } = useAuth();

  const { data: trustRulesData, isLoading: trustLoading } = useQuery({
    queryKey: ["/api/trust-score/me/rules"],
    queryFn: () => api.trustScore.getMyRules(),
    enabled: !!user,
  });

  const { data: creditRulesData, isLoading: creditsLoading } = useQuery({
    queryKey: ["/api/credits/rules"],
    queryFn: () => api.credits.getRules(),
    enabled: !!user,
  });

  return useMemo(() => {
    const emptyTrust: TrustScoreRewardTrustSlice = {
      amount: "—",
      isEarned: false,
      minContacts: null,
      pointsValue: null,
    };
    const emptyConnector: TrustScoreRewardConnectorSlice = {
      dollarDisplay: null,
      isEarned: false,
      threshold: null,
      importedCount: undefined,
      creditsValue: null,
    };

    if (!user) {
      return {
        amount: "—",
        label: "Trust Score Points",
        connectorSecondary: undefined,
        isLoading: false,
        trust: emptyTrust,
        connector: emptyConnector,
      };
    }

    const slug = CREDIT_PROVIDER_TO_TRUST_SLUG[provider];
    const trustInfo = getTrustPointsInfoForSlug(trustRulesData, slug);
    const creditInfo = getCreditInfoForProvider(creditRulesData, provider);

    const dollarDisplay =
      creditInfo.credits != null
        ? formatConnectorCreditsDollars(creditInfo.credits)
        : null;

    const connectorSecondary =
      creditInfo.credits != null && creditInfo.threshold != null
        ? creditInfo.isEarned
          ? `${dollarDisplay} Connector Credits Earned`
          : `Import ${creditInfo.threshold} ${
              creditInfo.threshold === 1 ? "contact" : "contacts"
            } to unlock ${dollarDisplay} Connector Credits`
        : undefined;

    const trustSlice: TrustScoreRewardTrustSlice = {
      amount: formatTrustModalHeroAmount(trustInfo),
      isEarned: trustInfo.isEarned,
      minContacts: trustMinContactsFromParams(trustInfo.configParams),
      pointsValue: trustInfo.points,
    };

    const connectorSlice: TrustScoreRewardConnectorSlice = {
      dollarDisplay,
      isEarned: creditInfo.isEarned,
      threshold: creditInfo.threshold,
      importedCount: creditInfo.importedContactsCount,
      creditsValue: creditInfo.credits,
    };

    if (trustLoading) {
      return {
        amount: "…",
        label: "Loading…",
        connectorSecondary: creditsLoading ? undefined : connectorSecondary,
        isLoading: true,
        trust: {
          amount: "…",
          isEarned: false,
          minContacts: trustSlice.minContacts,
          pointsValue: trustSlice.pointsValue,
        },
        connector: connectorSlice,
      };
    }

    return {
      amount: formatTrustModalHeroAmount(trustInfo),
      label: formatTrustModalHeroLabel(trustInfo),
      connectorSecondary,
      isLoading: creditsLoading,
      trust: trustSlice,
      connector: connectorSlice,
    };
  }, [user, trustLoading, creditsLoading, trustRulesData, creditRulesData, provider]);
}
