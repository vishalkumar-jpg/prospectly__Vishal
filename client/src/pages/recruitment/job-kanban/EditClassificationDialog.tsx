import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AlertCircle, Loader2, UserCog, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recruitmentApi } from "@/lib/api/recruitment";
import type {
  ConnectorClassificationInput,
  PayoutStateConnector,
} from "@/lib/api/recruitment";
import { useCandidatePayoutState } from "@/hooks/useCandidatePayoutState";
import { cn } from "@/lib/utils";
import { PayoutStatusPill } from "./PayoutStatusPill";
import { ConnectorIdentity } from "@/components/recruitment/ConnectorIdentity";

interface EditClassificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateLabel: string;
  onSuccess?: () => void;
}

type Draft = {
  connectorUserId: string;
  classificationType: "internal" | "external";
  isActiveEmployee: boolean;
};

export default function EditClassificationDialog({
  open,
  onOpenChange,
  candidateId,
  candidateLabel,
  onSuccess,
}: EditClassificationDialogProps) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const { state, loading, error, refetch } = useCandidatePayoutState(
    candidateId,
    { enabled: open }
  );

  // Only pending connectors are editable. Backend rejects edits for any other
  // status anyway; aligning the UI prevents the recruiter from filling in
  // fields that will be rejected.
  const pendingConnectors = useMemo<PayoutStateConnector[]>(
    () =>
      (state?.connectors ?? []).filter((c) => c.payout?.status === "pending"),
    [state]
  );
  const handledConnectors = useMemo<PayoutStateConnector[]>(
    () =>
      (state?.connectors ?? []).filter(
        (c) => !c.payout || c.payout.status !== "pending"
      ),
    [state]
  );

  useEffect(() => {
    if (!open) return;
    setDrafts(
      pendingConnectors.map((c) => ({
        connectorUserId: c.connectorUserId,
        classificationType:
          c.classificationType === "internal" ? "internal" : "external",
        isActiveEmployee: c.isActiveEmployee ?? true,
      }))
    );
  }, [open, pendingConnectors]);

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) =>
      prev.map((d) => (d.connectorUserId === id ? { ...d, ...patch } : d))
    );

  const mutation = useMutation({
    mutationFn: () => {
      const classifications: ConnectorClassificationInput[] = drafts.map(
        (d) => ({
          connectorUserId: d.connectorUserId,
          classificationType: d.classificationType,
          ...(d.classificationType === "internal"
            ? { isActiveEmployee: d.isActiveEmployee }
            : {}),
        })
      );
      return recruitmentApi.updateCandidateClassification(candidateId, {
        classifications,
      });
    },
    onSuccess: () => {
      toast.success("Classification updated", {
        description:
          "Connector classification has been saved. Payout timing may change based on the new type.",
      });
      queryClient.invalidateQueries();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error("Failed to update classification", {
        description:
          err?.message ||
          "The classification was not saved. Please try again.",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl max-sm:rounded-none"
        mobileFullscreen
        hideCloseButton
      >
        {/* Brand hero header */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient px-6 py-5 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm">
              <UserCog className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
              Edit connector classification
            </DialogTitle>
          </div>
          <DialogDescription className="relative mt-2 text-[13px] leading-relaxed text-white/90">
            Update how each connector is classified for {candidateLabel}.
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          )}

          {!loading && error && (
            <div className="space-y-3 rounded-2xl border border-brand-destructive/20 bg-brand-destructive/5 p-4">
              <div className="flex items-start gap-2 text-sm font-semibold text-brand-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Couldn&rsquo;t load connector data. Please try again.
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && state && (
            <>
              {/* Editable connectors */}
              <div className="space-y-3">
                {pendingConnectors.length > 0 ? (
                  <>
                    <Label className="text-sm font-bold">
                      Editable connectors
                    </Label>
                    {pendingConnectors.map((c) => {
                      const draft = drafts.find(
                        (d) => d.connectorUserId === c.connectorUserId
                      );
                      if (!draft) return null;
                      const isInternal =
                        draft.classificationType === "internal";
                      return (
                        <div
                          key={c.connectorUserId}
                          className={cn(
                            "rounded-2xl border p-4 transition-colors",
                            isInternal
                              ? "border-brand-success/30"
                              : "border-brand-sky/30"
                          )}
                        >
                          <ConnectorIdentity
                            name={c.name}
                            role={c.role}
                            avatar={c.avatar}
                            jobTitle={c.jobTitle}
                            company={c.company}
                            linkedinUrl={c.linkedinUrl}
                          />

                          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-dashed border-border pt-3.5 max-sm:flex-col max-sm:items-stretch">
                            <span className="text-xs font-bold text-muted-foreground max-sm:w-full">
                              Classification
                            </span>
                            <SegmentedControl
                              aria-label={`Classification for ${c.name}`}
                              className="max-sm:w-full max-sm:[&>button]:flex-1"
                              value={draft.classificationType}
                              onValueChange={(value) =>
                                updateDraft(c.connectorUserId, {
                                  classificationType: value as
                                    | "internal"
                                    | "external",
                                  // Switching to External clears the
                                  // internal-only flag; switching back to
                                  // Internal restores the default checked state.
                                  isActiveEmployee: value !== "external",
                                })
                              }
                              options={[
                                {
                                  value: "internal",
                                  label: "Internal",
                                  activeClassName:
                                    "data-[state=on]:text-brand-success",
                                },
                                {
                                  value: "external",
                                  label: "External",
                                  activeClassName:
                                    "data-[state=on]:text-brand-sky",
                                },
                              ]}
                            />
                            {isInternal && (
                              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-bold text-foreground max-sm:w-full sm:ml-auto">
                                <Checkbox
                                  checked={draft.isActiveEmployee}
                                  onCheckedChange={(v) =>
                                    updateDraft(c.connectorUserId, {
                                      isActiveEmployee: v === true,
                                    })
                                  }
                                />
                                Active employee
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No connectors are still pending classification.
                  </p>
                )}
              </div>

              {/* Already processed */}
              {handledConnectors.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Already processed
                  </Label>
                  <div className="space-y-3">
                    {handledConnectors.map((c) => (
                      <div
                        key={c.connectorUserId}
                        className="rounded-2xl border border-border bg-muted/30 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <ConnectorIdentity
                            name={c.name}
                            role={c.role}
                            avatar={c.avatar}
                            jobTitle={c.jobTitle}
                            company={c.company}
                            linkedinUrl={c.linkedinUrl}
                          />
                          {c.payout && (
                            <div className="shrink-0">
                              <PayoutStatusPill payout={c.payout} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-border bg-background px-6 py-4 max-sm:[&>button]:flex-1">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              loading ||
              !!error ||
              pendingConnectors.length === 0
            }
            className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
