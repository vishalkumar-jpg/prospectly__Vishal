import { useCallback, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PenTool,
  CheckCircle,
  Upload,
  Link,
  AlertTriangle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import type { CreationMethod, JobFormData, UpdateJobFormData } from "./types";
import type { StepErrors } from "./validation";
import { useJobExtraction } from "./useJobExtraction";
import UrlExtractionCard from "./UrlExtractionCard";
import FileExtractionCard from "./FileExtractionCard";

interface MethodStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  onExtractionComplete?: () => void;
  onExtractionBusyChange?: (busy: boolean) => void;
  stepErrors?: StepErrors;
  onClearError?: (field: string) => void;
}

const methods: {
  key: CreationMethod;
  icon: LucideIcon;
  title: string;
  desc: string;
}[] = [
  {
    key: "url",
    icon: Link,
    title: "Extract through URL",
    desc: "Paste any public job posting URL and our AI will extract all details automatically",
  },
  {
    key: "pdf",
    icon: Upload,
    title: "Upload PDF",
    desc: "Upload a job description file (PDF) and our AI will extract the details for you",
  },
  {
    key: "manual",
    icon: PenTool,
    title: "Create Manually",
    desc: "Fill in all job details step by step with AI-assisted description generation",
  },
];

export default function MethodStep({
  formData,
  updateFormData,
  onExtractionComplete,
  onExtractionBusyChange,
  stepErrors = {},
  onClearError,
}: MethodStepProps) {
  const {
    isParsing,
    masterDataLoading,
    masterDataError,
    masterDataUnavailable,
    industriesError,
    departmentsError,
    refetchIndustries,
    refetchDepartments,
    runExtraction,
    runUrlExtraction,
  } = useJobExtraction({
    updateFormData,
    sourceUrl: formData.sourceUrl,
    onExtractionComplete,
    onExtractionBusyChange,
  });

  const selectCreationMethod = useCallback(
    (key: CreationMethod) => {
      updateFormData({ creationMethod: key });
      onClearError?.("creationMethod");
    },
    [updateFormData, onClearError]
  );

  const handleMethodKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, key: CreationMethod) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectCreationMethod(key);
      }
    },
    [selectCreationMethod]
  );

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto text-center">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">
          How would you like to create your job post?
        </h2>
      </div>

      {masterDataError && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-brand-warning/30 bg-brand-warning/10 px-4 py-3 text-sm text-brand-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Failed to load job options.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-brand-warning hover:bg-brand-warning/10"
            onClick={() => {
              if (industriesError) refetchIndustries();
              if (departmentsError) refetchDepartments();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      <div
        className="grid w-full grid-cols-1 items-stretch gap-6 md:grid-cols-3"
        role="radiogroup"
        aria-label="Job creation method"
      >
        {methods.map(({ key, icon: Icon, title, desc }) => (
          <Card
            key={key}
            role="radio"
            aria-checked={formData.creationMethod === key}
            tabIndex={0}
            className={cn(
              "h-full min-w-0 cursor-pointer rounded-2xl border-2 duration-200 hover:-translate-y-1 hover:shadow-brand-card",
              "transition-[transform,background-color,border-color,box-shadow] motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              formData.creationMethod === key
                ? "border-brand-amethyst bg-brand-amethyst/10"
                : "border-border hover:border-brand-amethyst/40"
            )}
            onClick={() => selectCreationMethod(key)}
            onKeyDown={(e) => handleMethodKeyDown(e, key)}
          >
            <CardContent className="flex h-full flex-col p-6 text-center">
              <div
                className={cn(
                  "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl",
                  formData.creationMethod === key
                    ? "bg-brand-gradient text-brand-foreground shadow-brand-cta"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                <Icon className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {title}
              </h3>
              <p className="flex-1 text-sm text-muted-foreground">{desc}</p>
              {formData.creationMethod === key ? (
                <CheckCircle className="mx-auto mt-3 h-5 w-5 text-brand-amethyst" />
              ) : (
                <span className="mt-3 h-5" aria-hidden />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {stepErrors.creationMethod && (
        <p className="text-sm text-destructive text-center mt-2">
          {stepErrors.creationMethod}
        </p>
      )}

      {formData.creationMethod === "url" && (
        <UrlExtractionCard
          sourceUrl={formData.sourceUrl}
          onSourceUrlChange={(value) => updateFormData({ sourceUrl: value })}
          isParsing={isParsing}
          masterDataUnavailable={masterDataUnavailable}
          onExtract={() => void runUrlExtraction()}
        />
      )}

      {formData.creationMethod === "pdf" && (
        <FileExtractionCard
          isParsing={isParsing}
          masterDataUnavailable={masterDataUnavailable}
          masterDataLoading={masterDataLoading}
          masterDataError={masterDataError}
          onRunExtraction={(file) => void runExtraction(file)}
        />
      )}
    </div>
  );
}
