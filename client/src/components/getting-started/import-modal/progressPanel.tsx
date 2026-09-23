import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { importModalAccentGradient } from "@/components/getting-started/import-modal/modalStyles";
import type {
  LinkedInUploadErrorStep,
  LinkedInUploadPhase,
} from "@/hooks/useLinkedInImport";
import { GettingStartedInlineCheck } from "@/assets/getting-started/getting-started-icon-badge";
import { Loader } from "@/components/ui/loader";

type ZipRowStatus = "pending" | "active" | "done" | "error";
type ImportProgressMode = "contacts" | "oauth" | "file_upload";

interface ImportModalProgressPanelProps {
  providerName: string;
  title?: string;
  subtitle?: string;
  /** When set, replaces the default “Fetching contacts from …” line */
  statusLine?: ReactNode;
  /** OAuth, calendar, or ZIP upload flows use tailored checklist copy */
  mode?: ImportProgressMode;
  /** LinkedIn ZIP flow: HTML-style checklist + spinner */
  checklistVariant?: "default" | "linkedin_zip";
  /** Driven by `useLinkedInImport` while the ZIP upload runs */
  linkedinZipPhase?: LinkedInUploadPhase;
  linkedinZipErrorStep?: LinkedInUploadErrorStep | null;
  activeDotIndex?: number;
  /** Dot count (e.g. 4 for LinkedIn export wizard) */
  totalDots?: number;
  className?: string;
}

function zipRowStatuses(
  phase: LinkedInUploadPhase,
  errorStep: LinkedInUploadErrorStep | null | undefined
): [ZipRowStatus, ZipRowStatus, ZipRowStatus, ZipRowStatus] {
  if (phase === "error") {
    const e = errorStep ?? "presign";
    return [
      e === "presign" || e === "s3_upload" ? "error" : "done",
      e === "complete" ? "error" : "pending",
      "pending",
      "pending",
    ];
  }
  if (phase === "idle") {
    return ["active", "pending", "pending", "pending"];
  }
  if (phase === "presign" || phase === "s3_upload") {
    return ["active", "pending", "pending", "pending"];
  }
  if (phase === "complete") {
    return ["done", "active", "pending", "pending"];
  }
  if (phase === "success") {
    return ["done", "done", "pending", "pending"];
  }
  return ["pending", "pending", "pending", "pending"];
}

function LinkedInZipChecklistRow({
  status,
  label,
}: {
  status: ZipRowStatus;
  label: string;
}) {
  const row =
    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs";
  return (
    <div
      className={cn(
        row,
        status === "done" &&
          "bg-muted/80 text-emerald-600 dark:text-emerald-400",
        status === "active" &&
          "bg-gs-amethyst/10 font-semibold text-gs-amethyst",
        status === "pending" && "bg-muted/50 text-muted-foreground",
        status === "error" &&
          "bg-destructive/10 font-medium text-destructive dark:text-destructive"
      )}
    >
      <span
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px]",
          status === "done" &&
            "bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400",
          status === "active" &&
            "animate-pulse bg-gs-amethyst/20 text-gs-amethyst",
          status === "pending" &&
            "bg-secondary text-[10px] text-muted-foreground/40",
          status === "error" && "bg-destructive/20 font-bold text-destructive"
        )}
      >
        {status === "done" ? (
          <GettingStartedInlineCheck className="h-3 w-3" />
        ) : status === "error" ? (
          "!"
        ) : status === "active" ? (
          "●"
        ) : (
          "○"
        )}
      </span>
      {label}
    </div>
  );
}

function LinkedInZipChecklist({
  phase,
  errorStep,
}: {
  phase: LinkedInUploadPhase;
  errorStep: LinkedInUploadErrorStep | null | undefined;
}) {
  const [s0, s1, s2, s3] = zipRowStatuses(phase, errorStep);

  const row0Label =
    s0 === "done"
      ? "File uploaded successfully"
      : s0 === "error"
        ? "Upload failed"
        : phase === "presign"
          ? "Preparing upload…"
          : "Uploading your archive…";

  const row1Label =
    s1 === "error" ? "Couldn't start processing" : "Extracting contact data";

  return (
    <div className="mt-4 flex flex-col gap-1.5 text-left">
      <LinkedInZipChecklistRow status={s0} label={row0Label} />
      <LinkedInZipChecklistRow status={s1} label={row1Label} />
      <LinkedInZipChecklistRow status={s2} label="Matching and deduplicating" />
      <LinkedInZipChecklistRow status={s3} label="Finalizing import" />
    </div>
  );
}

function getImportProgressHeading(
  providerName: string,
  title: string | undefined,
  isLinkedInZip: boolean,
  mode: ImportProgressMode
): string {
  if (title) return title;
  if (isLinkedInZip) return "Importing your contacts...";
  if (mode === "oauth") return `Connecting ${providerName}...`;
  if (mode === "file_upload") return `Uploading your ${providerName} export...`;
  return `Syncing your ${providerName} contacts...`;
}

function ImportProgressStatusLine({
  statusLine,
  providerName,
  isLinkedInZip,
  mode,
}: {
  statusLine?: ReactNode;
  providerName: string;
  isLinkedInZip: boolean;
  mode: ImportProgressMode;
}) {
  if (statusLine) return <>{statusLine}</>;

  if (isLinkedInZip) {
    return (
      <>
        Processing{" "}
        <span className="font-bold text-foreground">your contacts</span>
      </>
    );
  }

  if (mode === "oauth") {
    return (
      <>
        Linking{" "}
        <span className="font-bold text-foreground">{providerName}</span> to
        your account
      </>
    );
  }

  if (mode === "file_upload") {
    return (
      <>
        Sending your{" "}
        <span className="font-bold text-foreground">{providerName}</span>{" "}
        archive securely
      </>
    );
  }

  return (
    <>
      Fetching contacts from{" "}
      <span className="font-bold text-foreground">{providerName}</span>
    </>
  );
}

function ImportProgressChecklistRow({
  state,
  label,
}: {
  state: "done" | "active" | "pending";
  label: string;
}) {
  const isDone = state === "done";
  const isActive = state === "active";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5",
        isDone || isActive ? "bg-muted/60" : "bg-muted/40"
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isDone && "bg-emerald-100 text-emerald-700",
          isActive && "bg-gs-amethyst/15 text-gs-amethyst",
          !isDone &&
            !isActive &&
            "border-2 border-muted-foreground/30 text-[10px] text-muted-foreground"
        )}
      >
        {isDone ? <GettingStartedInlineCheck /> : isActive ? "●" : "○"}
      </span>
      <span
        className={cn(
          "text-sm",
          isDone && "font-medium text-emerald-700 dark:text-emerald-400",
          isActive && "font-medium text-gs-amethyst",
          !isDone && !isActive && "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function ImportProgressOAuthChecklist() {
  return (
    <>
      <ImportProgressChecklistRow state="done" label="Authorization received" />
      <ImportProgressChecklistRow
        state="active"
        label="Securing your connection"
      />
      <ImportProgressChecklistRow state="pending" label="Finishing setup" />
    </>
  );
}

function ImportProgressFileUploadChecklist() {
  return (
    <>
      <ImportProgressChecklistRow
        state="done"
        label="Archive ready on your device"
      />
      <ImportProgressChecklistRow state="active" label="Uploading securely" />
      <ImportProgressChecklistRow
        state="pending"
        label="Processing in the background"
      />
    </>
  );
}

function ImportProgressContactsChecklist({
  providerName,
}: {
  providerName: string;
}) {
  return (
    <>
      <ImportProgressChecklistRow
        state="done"
        label={`${providerName} account connected`}
      />
      <ImportProgressChecklistRow state="active" label="Syncing contacts" />
      <ImportProgressChecklistRow
        state="pending"
        label="Deduplicating & finalizing"
      />
    </>
  );
}

function ImportProgressChecklist({
  providerName,
  isLinkedInZip,
  mode,
  linkedinZipPhase,
  linkedinZipErrorStep,
}: {
  providerName: string;
  isLinkedInZip: boolean;
  mode: ImportProgressMode;
  linkedinZipPhase: LinkedInUploadPhase;
  linkedinZipErrorStep: LinkedInUploadErrorStep | null | undefined;
}) {
  if (isLinkedInZip) {
    return (
      <LinkedInZipChecklist
        phase={linkedinZipPhase}
        errorStep={linkedinZipErrorStep}
      />
    );
  }

  if (mode === "oauth") return <ImportProgressOAuthChecklist />;
  if (mode === "file_upload") return <ImportProgressFileUploadChecklist />;
  return <ImportProgressContactsChecklist providerName={providerName} />;
}

export function ImportModalProgressPanel({
  providerName,
  title,
  subtitle = "Securely connecting to your account",
  statusLine,
  mode = "contacts",
  checklistVariant = "default",
  linkedinZipPhase = "idle",
  linkedinZipErrorStep = null,
  activeDotIndex = 1,
  totalDots = 3,
  className,
}: ImportModalProgressPanelProps) {
  const isLinkedInZip = checklistVariant === "linkedin_zip";
  const heading = getImportProgressHeading(
    providerName,
    title,
    isLinkedInZip,
    mode
  );
  const sub = isLinkedInZip
    ? "This usually takes less than a minute"
    : subtitle;

  return (
    <div className={cn("space-y-5 py-2 text-center", className)}>
      <ImportModalDots activeIndex={activeDotIndex} total={totalDots} />

      <Loader size="lg" className="py-0" />

      <div>
        <h3 className="text-lg font-extrabold text-foreground">{heading}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full rounded-full",
            importModalAccentGradient,
            isLinkedInZip
              ? "w-0 animate-import-modal-bar"
              : "w-3/5 animate-pulse"
          )}
          aria-hidden
        />
      </div>

      <p className="text-xs text-muted-foreground sm:text-sm">
        <ImportProgressStatusLine
          statusLine={statusLine}
          providerName={providerName}
          isLinkedInZip={isLinkedInZip}
          mode={mode}
        />
      </p>

      <div className="space-y-2 text-left">
        <ImportProgressChecklist
          providerName={providerName}
          isLinkedInZip={isLinkedInZip}
          mode={mode}
          linkedinZipPhase={linkedinZipPhase}
          linkedinZipErrorStep={linkedinZipErrorStep}
        />
      </div>
    </div>
  );
}
