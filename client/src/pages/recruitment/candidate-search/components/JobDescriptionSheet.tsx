import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Sparkles, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCandidateSearchCount } from "@/hooks/useCandidateSearchCount";
import { utcDayjs } from "@/lib/dayjs";
import {
  recruitmentCandidateSearchApi,
  type ParsedJobDescription,
} from "@/lib/api/recruitment-candidate-search";
import {
  mergeJobDescription,
  type CandidateSearchCriteria,
} from "@/lib/recruitment/candidate-search.criteria";
import { cn } from "@/lib/utils";

import { FilterGroup } from "./FilterGroup";

/**
 * Below this a description is a fragment, and an extractor asked to work from a
 * fragment returns a confident answer built out of nothing. Enforced in the UI
 * before Read is enabled (§12).
 */
const MIN_CHARS = 120;

const ACCEPT = ".txt,.pdf,.doc,.docx";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** The only format the browser can turn into text without a server round trip. */
const CLIENT_READABLE = /\.txt$/i;

type Source = "paste" | "upload";

const SOURCE_OPTIONS = [
  { value: "paste", label: "Paste" },
  { value: "upload", label: "Upload" },
];

/** A parse that found nothing is not something we can honestly commit. */
function isUsable(
  parsed: ParsedJobDescription | null
): parsed is ParsedJobDescription {
  return Boolean(
    parsed &&
    (parsed.role?.trim() ||
      parsed.mustHave.length > 0 ||
      parsed.niceToHave.length > 0)
  );
}

// ---------------------------------------------------------------- readout --

function Readout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function ChipRow({
  values,
  variant,
  empty,
}: {
  values: string[];
  variant: "secondary" | "outline";
  empty: string;
}) {
  if (values.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant={variant} className="font-normal">
          <span className="max-w-[200px] truncate">{value}</span>
        </Badge>
      ))}
    </div>
  );
}

function ReadoutSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-hidden>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-28" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- footer --

interface FooterProps {
  ready: boolean;
  count: number;
  textCounted: boolean;
  loading: boolean;
  failed: boolean;
  onClear: () => void;
  onApply: () => void;
}

/**
 * The same commit footer as the All-filters drawer, including §7.3: with a free
 * text query applied, `/count` sees structured filters only and the label must
 * say so rather than print a number the next screen contradicts.
 */
function CommitFooter({
  ready,
  count,
  textCounted,
  loading,
  failed,
  onClear,
  onApply,
}: FooterProps) {
  const counting = ready && loading && count === 0;
  const noMatches = ready && !counting && !failed && count === 0;

  const label = !ready
    ? "Show candidates"
    : failed
      ? "Show candidates"
      : counting
        ? "Counting…"
        : noMatches
          ? "No matches — edit the description"
          : textCounted
            ? `Show ${count.toLocaleString()} ${count === 1 ? "candidate" : "candidates"}`
            : `Show ${count.toLocaleString()} matching filters`;

  return (
    <div className="mt-auto shrink-0 border-t bg-muted/30 px-5 py-3.5">
      {ready && !failed && !counting && !textCounted && count > 0 ? (
        <p className="mb-2 text-xs text-muted-foreground">
          text ranking may narrow this
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onClear}
          className="shrink-0 hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
        >
          Clear
        </Button>
        <Button
          type="button"
          onClick={onApply}
          disabled={!ready || noMatches || counting}
          aria-live="polite"
          className="flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all duration-200 hover:shadow-brand-cta-lg disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ sheet --

export interface JobDescriptionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Applied criteria — the baseline the description is merged into (§9.2). */
  criteria: CandidateSearchCriteria;
  /** Applied = merged criteria, URL updated, sheet closes, results re-query. */
  onCommit: (next: CandidateSearchCriteria) => void;
  /** The "Match a JD" button, wired as the real Radix trigger so focus returns. */
  trigger: ReactNode;
}

/**
 * Reads a job description and turns it into criteria (§12, JD matching).
 *
 * It owns **no** scope and **no** match-score controls — those live in the
 * All-filters drawer, one source of truth per value. It also runs no search of
 * its own: it parses, merges into criteria and commits exactly like the drawer,
 * so there is a single code path from criteria to results.
 */
export function JobDescriptionSheet({
  open,
  onOpenChange,
  criteria,
  onCommit,
  trigger,
}: JobDescriptionSheetProps) {
  const isMobile = useIsMobile();
  const [source, setSource] = useState<Source>("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<{ name: string; note: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedJobDescription | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parse = useMutation({
    mutationFn: (value: string) =>
      recruitmentCandidateSearchApi.parseJobDescription(value),
    // Nothing here clears `text` or `file`: losing a pasted description to a
    // failed call is the worst outcome this sheet has.
    onSuccess: setParsed,
  });

  const chars = text.trim().length;
  const canParse = chars >= MIN_CHARS && !parse.isPending;
  const ready = isUsable(parsed);

  const draft = useMemo(
    () => (ready ? mergeJobDescription(criteria, parsed) : criteria),
    [criteria, parsed, ready]
  );

  // Counting a description nobody has parsed yet would just re-count what is
  // already on screen, so the footer stays quiet until there is something to show.
  const { count, textCounted, loading, error } = useCandidateSearchCount(
    draft,
    open && ready
  );

  const takeFile = useCallback(
    (picked: File | null) => {
      if (!picked) return;
      setFileError(null);
      setParsed(null);
      parse.reset();

      if (picked.size > MAX_FILE_BYTES) {
        setFile(null);
        setFileError("That file is over 10 MB. Paste the text instead.");
        return;
      }

      setFile({
        name: picked.name,
        note: `${Math.max(1, Math.round(picked.size / 1024)).toLocaleString()} KB · added ${utcDayjs().format("HH:mm")} UTC`,
      });

      if (!CLIENT_READABLE.test(picked.name)) {
        setText("");
        setFileError(
          "We can't read PDF or Word files yet. Open the file, copy the text, and paste it into the Paste tab."
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () =>
        setText(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () =>
        setFileError("We couldn't read that file. Paste the text instead.");
      reader.readAsText(picked);
    },
    [parse]
  );

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    takeFile(event.dataTransfer.files.item(0));
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    takeFile(event.target.files?.item(0) ?? null);
    // Re-picking the same file must fire change again.
    event.target.value = "";
  };

  /** Resets this sheet only. Applied criteria do not move until Show. */
  const handleClear = () => {
    setText("");
    setFile(null);
    setFileError(null);
    setParsed(null);
    parse.reset();
  };

  const handleApply = () => {
    if (!ready) return;
    onCommit(draft);
    onOpenChange(false);
  };

  const body = (
    <div className="flex-1 overflow-y-auto px-5 pb-2">
      <FilterGroup title="Source" activeCount={0}>
        <SegmentedControl
          value={source}
          onValueChange={(next) => setSource(next as Source)}
          options={SOURCE_OPTIONS}
          aria-label="Job description source"
          className="self-start"
        />

        {source === "paste" ? (
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="jd-paste"
              className="text-xs font-medium text-foreground"
            >
              Job description
            </Label>
            <Textarea
              id="jd-paste"
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-describedby="jd-paste-count"
              placeholder="Paste the full job description here — responsibilities, must-have skills, seniority, location…"
              className="min-h-[180px] resize-y text-sm"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-7 text-center",
                "transition-all duration-200 hover:border-brand-amethyst/60 hover:bg-muted/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst"
              )}
            >
              <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-muted-foreground">
                PDF, DOC, DOCX or TXT up to 10 MB
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={onPick}
              className="sr-only"
              aria-label="Upload a job description"
            />
            {file ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <FileText
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {file.note}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFileError(null);
                    setText("");
                  }}
                  aria-label={`Remove ${file.name}`}
                  className="rounded-full p-1 transition-all duration-200 hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <p id="jd-paste-count" className="text-xs text-muted-foreground">
            {chars.toLocaleString()} characters · at least {MIN_CHARS} needed
            for a reliable read
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canParse}
            onClick={() => parse.mutate(text.trim())}
            className="ml-auto"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {parse.isPending ? "Reading…" : "Read description"}
          </Button>
        </div>

        {fileError ? (
          <p className="text-xs text-brand-warning dark:text-brand-warning">
            {fileError}
          </p>
        ) : null}

        {parse.isError ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
            <p className="min-w-0 flex-1 text-xs text-destructive">
              We couldn&apos;t read that description. Your text is still here —
              try again.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => parse.mutate(text.trim())}
              disabled={!canParse}
            >
              Try again
            </Button>
          </div>
        ) : null}
      </FilterGroup>

      {parse.isPending || parsed ? (
        <FilterGroup title="What we read" activeCount={0}>
          {parse.isPending ? (
            <ReadoutSkeleton />
          ) : parsed ? (
            <>
              <Readout label="Role">
                <p className="text-sm">
                  {parsed.role?.trim() || (
                    <span className="text-muted-foreground">
                      No role title found
                    </span>
                  )}
                </p>
              </Readout>
              <Readout label="Seniority">
                <p className="text-sm">
                  {parsed.seniority?.trim() || (
                    <span className="text-muted-foreground">Not stated</span>
                  )}
                </p>
              </Readout>
              <Readout label="Must-have skills · these filter">
                <ChipRow
                  values={parsed.mustHave}
                  variant="secondary"
                  empty="None found — the search will match on the role title alone."
                />
              </Readout>
              <Readout label="Nice to have · these only score">
                <ChipRow
                  values={parsed.niceToHave}
                  variant="outline"
                  empty="None found."
                />
              </Readout>
              {!ready ? (
                <p className="text-xs text-brand-warning dark:text-brand-warning">
                  We found nothing to search on in that text. Try a fuller
                  description.
                </p>
              ) : null}
            </>
          ) : null}
        </FilterGroup>
      ) : null}
    </div>
  );

  const footer = (
    <CommitFooter
      ready={ready}
      count={count}
      textCounted={textCounted}
      loading={loading}
      failed={Boolean(error)}
      onClear={handleClear}
      onApply={handleApply}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[88vh]">
          <div className="flex items-center gap-2 px-5 pb-3 pt-4">
            <DrawerTitle className="text-lg font-semibold">
              Match a job description
            </DrawerTitle>
            <Button
              type="button"
              variant="link"
              onClick={handleClear}
              className="ml-auto h-auto p-0 text-xs text-brand-rose"
            >
              Start over
            </Button>
          </div>
          {body}
          {footer}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        // Same measurements as the All-filters drawer (variants.css:85-98):
        // width min(440px, 94vw), 240ms slide from 105%, scrim rgba(15,23,42,.34).
        // Reduced motion drops the transform, which Radix leaves to us.
        overlayClassName="bg-[rgba(15,23,42,0.34)]"
        className={cn(
          "flex w-[min(440px,94vw)] max-w-none flex-col gap-0 p-0 sm:max-w-none",
          "ease-[cubic-bezier(.2,.7,.3,1)] data-[state=closed]:duration-[240ms] data-[state=open]:duration-[240ms]",
          "data-[state=open]:slide-in-from-right-[105%] data-[state=closed]:slide-out-to-right-[105%]",
          "motion-reduce:animate-none motion-reduce:transition-none"
        )}
        aria-describedby={undefined}
      >
        <div className="flex shrink-0 items-center gap-3 border-b px-5 py-4 pr-14">
          <SheetTitle className="text-lg font-semibold">
            Match a job description
          </SheetTitle>
          <Button
            type="button"
            variant="link"
            onClick={handleClear}
            className="ml-auto h-auto p-0 text-xs text-brand-rose"
          >
            Start over
          </Button>
        </div>
        {body}
        {footer}
      </SheetContent>
    </Sheet>
  );
}
