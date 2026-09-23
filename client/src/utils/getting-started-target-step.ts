import type { GettingStartedProgress } from "@/lib/api/getting-started";

/**
 * When `null`, do not override the URL step (loading or graduated user).
 */
export function getGettingStartedTargetStep(
  progress: GettingStartedProgress | undefined
): 1 | 2 | 3 | null {
  if (!progress) {
    return null;
  }

  const hasFocusStep = progress.hasFocusStep !== false;

  if (hasFocusStep) {
    if (progress.step3Complete) return null;
    if (!progress.step1Complete) return 1;
    if (!progress.step2Complete) return 2;
    return 3;
  }

  // No Choose Focus: step1=import, step2=get going
  if (progress.step1Complete && progress.step2Complete) return null;
  if (!progress.step1Complete) return 1;
  return 2;
}

export function getGettingStartedMaxStep(hasFocusStep: boolean): 2 | 3 {
  return hasFocusStep ? 3 : 2;
}
