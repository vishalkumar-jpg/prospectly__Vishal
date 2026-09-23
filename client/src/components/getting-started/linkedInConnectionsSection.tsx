import { useState, useEffect, useRef } from "react";
import { Linkedin, ArrowRight, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import LinkedInImportModal from "@/components/LinkedInImportModal";
import { LinkedInStatsRewardRow } from "@/components/getting-started/linked-in-stats-reward-row";
import { useContactSourceStatus } from "@/hooks/useContactSourceStatus";
import { api } from "@/lib/api";
import { AnyType } from "@/types/common";
import { useToast } from "@/hooks/use-toast";
import { GettingStartedIconBadge } from "@/assets/getting-started/getting-started-icon-badge";

function stopCardActivation(e: React.MouseEvent | React.KeyboardEvent) {
  e.stopPropagation();
}

function getLinkedInImportFlags({ status }: { status?: string }) {
  const isPending = status === "pending";
  const isProcessing = status === "processing";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  return {
    isPending,
    isProcessing,
    isCompleted,
    isFailed,
    isImporting: isPending || isProcessing,
  };
}

function shouldPollLinkedInImport({
  status,
  importId,
}: {
  status?: string;
  importId?: string;
}): boolean {
  const isImporting = status === "pending" || status === "processing";
  return isImporting && !!importId;
}

function handleLinkedInCardKeyDown({
  event,
  isImporting,
  setIsModalOpen,
}: {
  event: React.KeyboardEvent;
  isImporting: boolean;
  setIsModalOpen: (open: boolean) => void;
}): void {
  if (isImporting || (event.key !== "Enter" && event.key !== " ")) {
    return;
  }
  event.preventDefault();
  setIsModalOpen(true);
}

// function LinkedInConnectorCreditsBlock({
//   creditInfo,
//   connectorTooltip,
// }: {
//   creditInfo: ReturnType<typeof getLinkedInCreditInfo>;
//   connectorTooltip: string;
// }) {
//   if (creditInfo.threshold == null || creditInfo.credits == null) return null;
//   return (
//     <div className="text-center sm:text-right">
//       <div className="flex items-end justify-end gap-1">
//         <div>
//           <div
//             className={cn(
//               "font-mono text-[32px] font-extrabold leading-none tracking-[-0.04em]",
//               creditInfo.isEarned && "text-emerald-200"
//             )}
//           >
//             {formatConnectorCreditsDollars(creditInfo.credits)}
//           </div>
//           <div className="mt-0.5 text-[11px] text-white/50">
//             Connector Credits
//           </div>
//         </div>
//         <Tooltip>
//           <TooltipTrigger asChild>
//             <button
//               type="button"
//               className="mb-1 inline-flex shrink-0 rounded-full text-white/45 hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
//               aria-label="About Connector Credits"
//               onClick={stopCardActivation}
//               onKeyDown={stopCardActivation}
//             >
//               <Info className="h-3 w-3" />
//             </button>
//           </TooltipTrigger>
//           <TooltipContent className="max-w-xs">
//             <p className="text-xs leading-snug text-muted-foreground">
//               {connectorTooltip}
//             </p>
//           </TooltipContent>
//         </Tooltip>
//       </div>
//     </div>
//   );
// }

function LinkedInImportProgressIndicator({
  isPending,
  isProcessing,
}: {
  isPending: boolean;
  isProcessing: boolean;
}) {
  if (isPending) {
    return (
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span className="text-[11px] font-semibold text-amber-300">Queued</span>
      </div>
    );
  }
  if (!isProcessing) return null;
  return (
    <div className="flex w-full min-w-[200px] flex-col items-end gap-2 sm:w-auto">
      <p className="text-xs text-white/70">Importing contacts…</p>
      <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-white/20">
        <div className="h-full w-full animate-pulse rounded-full bg-white/90" />
      </div>
      <p className="text-[11px] text-white/60">
        Usually ~5 min — runs in the background
      </p>
    </div>
  );
}

function LinkedInImportFailedBanner({
  errorMessage,
}: {
  errorMessage?: string | null;
}) {
  return (
    <div className="flex max-w-sm items-start gap-2 rounded-lg bg-red-500/20 px-3 py-2">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-200" />
      <div>
        <p className="text-sm font-semibold text-red-100">Import failed</p>
        {errorMessage ? (
          <p className="text-xs text-red-100/90">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

function LinkedInCardActionRail({
  isImporting,
  isFailed,
  isCompleted,
  isPending,
  isProcessing,
  errorMessage,
  onOpenModal,
}: {
  isImporting: boolean;
  isFailed: boolean;
  isCompleted: boolean;
  isPending: boolean;
  isProcessing: boolean;
  errorMessage?: string | null;
  onOpenModal: () => void;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end lg:flex-col lg:items-end xl:flex-row xl:items-center"
      )}
    >
      {!isImporting && !isFailed ? (
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          {/* <LinkedInConnectorCreditsBlock
            creditInfo={creditInfo}
            connectorTooltip={connectorTooltip}
          /> */}
          <Button
            className="whitespace-nowrap rounded-xl bg-white px-[26px] py-3 text-[15px] font-bold text-[#0A66C2] shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:scale-[1.02] hover:bg-[#F0F7FF]"
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal();
            }}
          >
            {isCompleted ? (
              <>
                Import Again
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Connect LinkedIn
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      ) : null}
      <LinkedInImportProgressIndicator
        isPending={isPending}
        isProcessing={isProcessing}
      />
      {isFailed ? (
        <LinkedInImportFailedBanner errorMessage={errorMessage} />
      ) : null}
    </div>
  );
}

export default function LinkedInConnectionsSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { sourceStatuses, refreshSourceStatuses } = useContactSourceStatus();
  const [, setImportStatus] = useState<AnyType>(null);
  const [, setIsLoadingStatus] = useState(false);
  const { toast } = useToast();
  const pollErrorCount = useRef(0);

  const linkedinStatus = sourceStatuses.find((s) => s.source === "LinkedIn");

  useEffect(() => {
    const importId = linkedinStatus?.latestImport?.id;
    const importStatus = linkedinStatus?.latestImport?.status;
    if (!shouldPollLinkedInImport({ status: importStatus, importId })) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        setIsLoadingStatus(true);
        const status = await api.linkedin.getImportStatus(importId);
        pollErrorCount.current = 0;
        setImportStatus(status);
        await refreshSourceStatuses();
      } catch {
        pollErrorCount.current += 1;
        if (pollErrorCount.current === 3) {
          toast({
            title: "Import status check failed",
            description:
              "We're having trouble checking your import status. Please refresh the page if this persists.",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoadingStatus(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [
    linkedinStatus?.latestImport?.status,
    linkedinStatus?.latestImport?.id,
    refreshSourceStatuses,
    toast,
  ]);

  const handleSuccess = async () => {
    await refreshSourceStatuses();
    setIsModalOpen(false);
  };

  const importFlags = getLinkedInImportFlags({
    status: linkedinStatus?.latestImport?.status,
  });
  const { isCompleted, isFailed, isImporting, isPending, isProcessing } =
    importFlags;

  const imported = linkedinStatus?.latestImport?.imported || 0;
  const duplicates = linkedinStatus?.latestImport?.duplicates || 0;
  const totalFetched = linkedinStatus?.latestImport?.totalFetched || 0;

  const showStatsRow = isCompleted;

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <div
          className={cn(
            "relative mb-[26px] overflow-hidden rounded-[20px] px-[34px] py-[30px] text-white",
            "bg-[linear-gradient(110deg,#0A2F7C_0%,#123D9A_45%,#1D4ED8_100%)]",
            "shadow-[0_18px_40px_-18px_rgba(13,46,124,0.55)] transition-all duration-300",
            !isCompleted &&
              !isImporting &&
              "cursor-pointer hover:-translate-y-[3px] hover:shadow-[0_12px_40px_rgba(10,102,194,0.2)]"
          )}
          onClick={() => !isImporting && setIsModalOpen(true)}
          onKeyDown={(event) =>
            handleLinkedInCardKeyDown({
              event,
              isImporting,
              setIsModalOpen,
            })
          }
          role={!isImporting ? "button" : undefined}
          tabIndex={!isImporting ? 0 : undefined}
          aria-label={!isImporting ? "Connect LinkedIn" : undefined}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_200px_at_85%_-20%,rgba(255,255,255,0.16),transparent_70%),radial-gradient(300px_200px_at_5%_120%,rgba(39,183,232,0.25),transparent_70%)]"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[15px] border border-white/25 bg-white/[0.14] backdrop-blur-sm">
                <Linkedin
                  className="h-[26px] w-[26px] text-white"
                  strokeWidth={1.5}
                />
              </div>
              <div className="min-w-0">
                <div className="mb-[7px] flex flex-wrap items-center gap-3">
                  <h3 className="text-[1.35rem] font-extrabold leading-tight tracking-tight">
                    Start with LinkedIn
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex cursor-default items-center gap-1 rounded-md bg-gs-rose px-2.5 py-0.5 text-[10px] font-bold text-white"
                        onClick={stopCardActivation}
                        onKeyDown={stopCardActivation}
                      >
                        <GettingStartedIconBadge
                          name="star"
                          size="xs"
                          bare
                          className="text-white"
                        />
                        2× Referral Payout
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Earn 2× higher referral rewards from LinkedIn-imported
                        connections.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-[0.92rem] leading-snug text-[#C7D8FF]">
                  Richest data — titles, companies, mutual connections
                </p>
              </div>
            </div>

            <LinkedInCardActionRail
              isImporting={isImporting}
              isFailed={isFailed}
              isCompleted={isCompleted}
              isPending={isPending}
              isProcessing={isProcessing}
              errorMessage={linkedinStatus?.latestImport?.errorMessage}
              onOpenModal={() => setIsModalOpen(true)}
            />
          </div>

          {showStatsRow ? (
            <LinkedInStatsRewardRow
              imported={imported}
              totalFetched={totalFetched}
              duplicates={duplicates}
              isCompleted={isCompleted}
            />
          ) : null}
        </div>
      </TooltipProvider>

      <LinkedInImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
