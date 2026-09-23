import {
  useTrustScoreRewardDisplay,
  type ImportModalCreditProvider,
} from "@/hooks/useTrustScoreRewardDisplay";
import { ImportModalRewardCard } from "@/components/getting-started/import-modal/rewardCard";

export type ImportModalSuccessCreditProvider = ImportModalCreditProvider;

export function ImportModalSuccessPanelDynamicReward({
  provider,
}: {
  provider: ImportModalSuccessCreditProvider;
}) {
  const reward = useTrustScoreRewardDisplay(provider);
  return (
    <div className="rounded-2xl bg-emerald-50 py-4 dark:bg-emerald-950/30">
      <ImportModalRewardCard reward={reward} framing="plain" />
    </div>
  );
}
