import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ExternalLink,
  Lightbulb,
  Loader2,
  Search,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  recruitmentCandidateSearchApi,
  type ParsedJobDescription,
} from "@/lib/api/recruitment-candidate-search";
import { cn } from "@/lib/utils";

/** The only format the parse endpoint accepts. */
const ACCEPT = ".pdf";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_LABEL = "5MB";

function rejectionReason(file: File): string | null {
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
    return "That file is not a PDF. Upload the job description as a PDF.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `That file is larger than ${MAX_FILE_LABEL}. Upload a smaller PDF.`;
  }
  return null;
}

/**
 * Nothing extracted is nothing to match on — committing it would produce a
 * confident, unfiltered result set that looks like it answered the description.
 */
function isUsable(parsed: ParsedJobDescription | null): boolean {
  return Boolean(
    parsed &&
    (parsed.role?.trim() ||
      parsed.mustHave.length > 0 ||
      parsed.niceToHave.length > 0)
  );
}

// ------------------------------------------------------------ explainer ----

const STEPS = [
  {
    title: "Search with keywords",
    body: "Search skills, job titles, companies, or software to find relevant candidates.",
    example: "Accountant NetSuite IFRS",
  },
  {
    title: "Upload a job description",
    body: "Upload a JD and we'll read it to find candidates with the strongest match.",
    example: null,
  },
  {
    title: "Refine with filters",
    body: "Narrow results by AI match score, country, roles, status, experience, employment type and work mode.",
    example: null,
  },
] as const;

function HowItWorksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How Candidate Search works</DialogTitle>
          <DialogDescription>
            Find candidates across your entire database using one or more search
            methods.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.body}</p>
                {step.example ? (
                  <p className="mt-1.5 inline-block rounded-md bg-muted px-2 py-1 font-mono text-xs">
                    {step.example}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------- dropzone ----

interface DropzoneProps {
  onParsed: (parsed: ParsedJobDescription) => void;
}

function JobDescriptionDropzone({ onParsed }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const parse = useMutation({
    mutationFn: (file: File) =>
      recruitmentCandidateSearchApi.parseJobDescriptionFile(file),
    onSuccess: (parsed) => {
      if (!isUsable(parsed)) {
        setError(
          "We couldn't read any skills or a role from that PDF. Try a text-based file rather than a scan."
        );
        return;
      }
      setError(null);
      onParsed(parsed);
    },
    onError: (cause) =>
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't read that job description. Try again in a moment."
      ),
  });

  const accept = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const reason = rejectionReason(file);
      setFileName(file.name);
      if (reason) {
        setError(reason);
        return;
      }
      setError(null);
      parse.mutate(file);
    },
    [parse]
  );

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files?.[0]);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    accept(event.target.files?.[0]);
    // Same file twice in a row must still fire a change event.
    event.target.value = "";
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={parse.isPending}
        aria-describedby="jd-dropzone-hint"
        className={cn(
          "flex h-[92px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/30 px-4 text-center transition-all duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst disabled:cursor-not-allowed",
          dragging && "border-brand-amethyst bg-brand-amethyst/5",
          error && "border-destructive/60"
        )}
      >
        {parse.isPending ? (
          <>
            <Loader2
              className="h-5 w-5 animate-spin text-muted-foreground"
              aria-hidden
            />
            <span className="text-sm font-medium">Reading {fileName}…</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">
              Click to upload or drag and drop
            </span>
            <span className="text-xs text-muted-foreground">
              PDF only (Max {MAX_FILE_LABEL})
            </span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-xs text-destructive"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        <p id="jd-dropzone-hint" className="text-xs text-muted-foreground">
          We'll analyze the JD and find candidates with the strongest match
        </p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- card ----

export interface SearchLaunchCardProps {
  /** Pending query from `useCandidateSearchCriteria` — never local state. */
  query: string;
  onQueryChange: (value: string) => void;
  /** Runs the ranked search. Wired to the button and to Enter, never to typing. */
  onSubmit: () => void;
  /** Merged into applied criteria by the page, exactly as the JD sheet commits. */
  onJobDescriptionParsed: (parsed: ParsedJobDescription) => void;
}

/**
 * The two ways into a search, side by side: type terms, or hand over a PDF.
 *
 * Deliberately no boolean-operator affordance. The server parses free text as
 * terms, not as an expression, so advertising AND/OR/NOT would return results
 * that confidently contradict what the recruiter asked for.
 */
export function SearchLaunchCard({
  query,
  onQueryChange,
  onSubmit,
  onJobDescriptionParsed,
}: SearchLaunchCardProps) {
  const [explainerOpen, setExplainerOpen] = useState(false);

  return (
    <section className="rounded-xl border bg-card">
      <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4 md:p-5">
        <div className="space-y-2">
          <Label htmlFor="candidate-search-input" className="text-sm">
            Search candidates
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="candidate-search-input"
                type="search"
                value={query}
                autoComplete="off"
                placeholder="Enter skills, job titles, companies, software..."
                className="pl-9 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst"
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  onSubmit();
                }}
              />
            </div>
            <Button
              type="button"
              onClick={onSubmit}
              // The page's single filled primary, on the brand gradient the
              // rest of recruitment uses for its main call to action.
              className="shrink-0 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all duration-200 hover:shadow-brand-cta-lg focus-visible:ring-2 focus-visible:ring-brand-amethyst"
            >
              Search
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Try skills, titles, companies or software (e.g. NetSuite,
            Accountant, IFRS)
          </p>
        </div>

        {/* Horizontal on stacked layouts, vertical once the columns sit side by side. */}
        <div
          aria-hidden
          className="flex items-center gap-3 md:flex-col md:px-2"
        >
          <span className="h-px flex-1 bg-border md:h-auto md:w-px md:flex-1" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-border md:h-auto md:w-px md:flex-1" />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Upload Job Description</Label>
          <JobDescriptionDropzone onParsed={onJobDescriptionParsed} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2.5 md:px-5">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Use keywords, upload a JD, and filters to find the best matching
          candidates.
        </p>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => setExplainerOpen(true)}
          className="h-auto gap-1 p-0 text-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-amethyst text-brand-rose"
        >
          Learn more
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Button>
      </div>

      <HowItWorksDialog open={explainerOpen} onOpenChange={setExplainerOpen} />
    </section>
  );
}
