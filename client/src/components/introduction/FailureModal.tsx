import { IntroductionDetailsModal } from "./IntroductionDetailsModal";
import { ActiveIntroduction } from "./UnfulfilledTab.types";

interface FailureModalProps {
  isOpen: boolean;
  onClose: () => void;
  introduction: ActiveIntroduction | null;
  failureInfo: {
    failureStage: string;
    failureReason: string;
  } | null;
  getStageInfo: () => {
    title: string;
    color: string;
    percentage: number;
  };
}

export function FailureModal({
  isOpen,
  onClose,
  introduction,
  failureInfo,
  getStageInfo,
}: FailureModalProps) {
  return (
    <IntroductionDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      introduction={introduction}
      stageInfo={getStageInfo()}
      isUnfulfilled={true}
      failureStage={failureInfo?.failureStage}
      failureReason={failureInfo?.failureReason}
    />
  );
}
