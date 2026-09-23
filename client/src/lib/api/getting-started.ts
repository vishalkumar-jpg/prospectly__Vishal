import { request } from "./core";
import type {
  PreferredWorkspace,
  PrimaryWorkspace,
} from "@/lib/workspace-focus";

export interface GettingStartedProgress {
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
  preferredWorkspace: PreferredWorkspace | null;
  primaryWorkspace: PrimaryWorkspace | null;
  hasFocusStep: boolean;
}

export const gettingStartedApi = {
  getProgress: () =>
    request<GettingStartedProgress>("/auth/getting-started/progress"),
};
