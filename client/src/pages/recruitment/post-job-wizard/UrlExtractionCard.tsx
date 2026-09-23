import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import {
  formatCharCount,
  getJobExtractionUrlInputError,
  isNearLimit,
  jobExtractionUrlInputSchema,
  JOB_FIELD_LIMITS,
} from "./validation";

interface UrlExtractionCardProps {
  sourceUrl: string;
  onSourceUrlChange: (value: string) => void;
  isParsing: boolean;
  masterDataUnavailable: boolean;
  onExtract: () => void;
}

export default function UrlExtractionCard({
  sourceUrl,
  onSourceUrlChange,
  isParsing,
  masterDataUnavailable,
  onExtract,
}: UrlExtractionCardProps) {
  const urlError = useMemo(
    () => getJobExtractionUrlInputError(sourceUrl),
    [sourceUrl]
  );

  const urlReadyForExtract = useMemo(() => {
    const result = jobExtractionUrlInputSchema.safeParse(sourceUrl);
    return result.success && result.data.length > 0;
  }, [sourceUrl]);

  const sourceUrlLen = sourceUrl.length;
  const sourceUrlMax = JOB_FIELD_LIMITS.sourceUrl.max;

  return (
    <div className="w-full mt-8 text-left">
      <Card className="rounded-2xl border border-brand-amethyst/30 bg-brand-amethyst/5 shadow-brand-card">
        <CardContent className="p-6">
          <Label className="text-sm font-medium mb-2 block">
            Paste the job posting URL
          </Label>
          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
            <div className="flex-1 min-w-0 space-y-1.5">
              <Input
                type="url"
                placeholder="https://www.example.com/jobs/senior-engineer"
                value={sourceUrl}
                onChange={(e) => onSourceUrlChange(e.target.value)}
                maxLength={sourceUrlMax}
                className={cn(
                  "bg-background",
                  urlError &&
                    "border-destructive focus-visible:ring-destructive"
                )}
                disabled={isParsing || masterDataUnavailable}
                aria-invalid={!!urlError}
              />
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs">
                {urlError ? (
                  <p className="text-destructive">{urlError}</p>
                ) : (
                  <span />
                )}
                <span
                  className={cn(
                    "text-muted-foreground tabular-nums shrink-0",
                    isNearLimit(sourceUrlLen, sourceUrlMax) &&
                      "text-destructive"
                  )}
                >
                  {formatCharCount(sourceUrlLen, sourceUrlMax)}
                </span>
              </div>
            </div>
            <Button
              type="button"
              onClick={onExtract}
              disabled={
                !urlReadyForExtract || isParsing || masterDataUnavailable
              }
              className="shrink-0 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
