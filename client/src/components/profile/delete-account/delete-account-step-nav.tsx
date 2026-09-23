import WizardStepRail from "@/pages/recruitment/post-job-wizard/components/WizardStepRail";
import { DELETE_ACCOUNT_STEPS } from "./delete-account.constants";

type DeleteAccountStepNavProps = {
  currentStep: number;
  onStepSelect: (stepId: number) => void;
};

const STEPS = DELETE_ACCOUNT_STEPS.map((step) => ({
  id: step.id,
  title: step.title,
}));

export function DeleteAccountStepNav({
  currentStep,
  onStepSelect,
}: DeleteAccountStepNavProps) {
  return (
    <WizardStepRail
      layout="horizontal"
      ariaLabel="Delete account progress"
      steps={STEPS}
      currentStep={currentStep}
      onStepSelect={onStepSelect}
    />
  );
}
