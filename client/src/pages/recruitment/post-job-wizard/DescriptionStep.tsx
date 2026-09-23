import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextContent } from "@/components/ui/rich-text-content";
import {
  FieldAccordion,
  FieldAccordionItem,
} from "@/components/ui/field-accordion";
import {
  ClipboardCheck,
  FileText,
  Gift,
  ListChecks,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { richTextLength } from "@/lib/rich-text";
import { useGenerateJobDescription } from "@/hooks/useGenerateJobDescription";
import {
  JOB_FIELD_LIMITS,
  formatCharCount,
  isNearLimit,
  getStepFieldError,
  type JobDescriptionFieldKey,
  type StepErrors,
} from "./validation";
import type { JobFormData, UpdateJobFormData } from "./types";

/** Section config for the Job Description accordion (first item open by default). */
const DESCRIPTION_FIELDS: Array<{
  key: JobDescriptionFieldKey;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  required: boolean;
  placeholder: string;
}> = [
  {
    key: "description",
    label: "Job Description",
    subtitle: "Overview of the role",
    icon: <FileText />,
    required: true,
    placeholder: "Describe the role, team, and what makes it exciting...",
  },
  {
    key: "requirements",
    label: "Requirements",
    subtitle: "Must-have qualifications",
    icon: <ClipboardCheck />,
    required: true,
    placeholder: "List the required and preferred qualifications...",
  },
  {
    key: "responsibilities",
    label: "Responsibilities",
    subtitle: "Day-to-day duties",
    icon: <ListChecks />,
    required: false,
    placeholder: "Key responsibilities for this role...",
  },
  {
    key: "benefits",
    label: "Benefits & Perks",
    subtitle: "What you offer to employees",
    icon: <Gift />,
    required: false,
    placeholder: "What you offer to employees...",
  },
];

interface DescriptionStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  isEditMode?: boolean;
  readOnly?: boolean;
  stepErrors?: StepErrors;
  onClearError?: (field: string) => void;
  onUpdateStepFieldError?: (field: string, message: string | undefined) => void;
  /** Increments each time full-step validation fails on "Continue"; used to
   * auto-expand the first errored section. */
  validationNonce?: number;
  industries?: Array<{ id: number; name: string }>;
  departments?: Array<{ id: number; name: string }>;
}

export default function DescriptionStep({
  formData,
  updateFormData,
  isEditMode,
  readOnly = false,
  stepErrors = {},
  onClearError,
  onUpdateStepFieldError,
  validationNonce,
  industries,
  departments,
}: DescriptionStepProps) {
  // Controlled single-open state — first section open by default.
  const [openItem, setOpenItem] = useState<string>(DESCRIPTION_FIELDS[0].key);

  // When validation fails on "Continue", auto-expand the first errored section
  // so the user lands directly on it. Keyed on validationNonce only, so live
  // (per-keystroke) validation does not yank the open panel around.
  useEffect(() => {
    if (!validationNonce) return;
    const firstErrored = DESCRIPTION_FIELDS.find((f) => stepErrors[f.key]);
    if (firstErrored) setOpenItem(firstErrored.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationNonce]);

  const generateMutation = useGenerateJobDescription({
    formData,
    updateFormData,
    onClearError,
    industries,
    departments,
  });

  const isGenerating = generateMutation.isPending;

  /** On text change, update form and live-validate this field */
  const handleTextChange = (field: string, value: string) => {
    updateFormData({ [field]: value });
    const prospective = { ...formData, [field]: value } as JobFormData;
    onUpdateStepFieldError?.(
      field,
      getStepFieldError("description", field, prospective)
    );
  };

  const handleAIGenerate = () => {
    generateMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="text-left mb-4 sm:mb-6 lg:mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">
          Job Description
        </h2>
        <p className="text-muted-foreground mt-2">
          {formData.description
            ? "Edit the job description content"
            : "Generate or write the job description"}
        </p>
      </div>

      <div className="w-full space-y-4 sm:space-y-6">
        {!formData.description && !isEditMode && !readOnly && (
          <Card className="rounded-2xl border-2 border-dashed border-brand-amethyst/40 bg-brand-amethyst/5">
            <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-brand-gradient mx-auto mb-4 flex items-center justify-center shadow-brand-cta">
                <Wand2 className="h-8 w-8 text-brand-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-foreground">
                Generate with AI
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                AI will create a complete job description based on your
                selections
              </p>
              <Button
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> Generate Description
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <FieldAccordion value={openItem} onValueChange={setOpenItem}>
          {DESCRIPTION_FIELDS.map((field) => {
            const value = formData[field.key] ?? "";
            const length = richTextLength(value);
            const limits = JOB_FIELD_LIMITS[field.key];
            const error = stepErrors[field.key];
            const fieldId = `field-${field.key}`;

            return (
              <FieldAccordionItem
                key={field.key}
                value={field.key}
                icon={field.icon}
                title={field.label}
                subtitle={field.subtitle}
                required={field.required}
                complete={length >= limits.min}
                hasError={!!error}
                errorHint={error}
                badge={formatCharCount(length, limits.max)}
              >
                <div className="space-y-2 pt-3">
                  {readOnly ? (
                    <div className="rounded-md border border-input bg-muted/30 px-3 py-2">
                      <RichTextContent value={value} />
                    </div>
                  ) : (
                    <RichTextEditor
                      id={fieldId}
                      value={value}
                      onChange={(html) => handleTextChange(field.key, html)}
                      placeholder={field.placeholder}
                      ariaInvalid={!!error}
                      ariaDescribedBy={`${fieldId}-desc`}
                    />
                  )}
                  <div
                    id={`${fieldId}-desc`}
                    className="flex justify-between text-xs"
                  >
                    {error ? (
                      <span className="text-destructive" role="alert">
                        {error}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Minimum {limits.min} characters
                      </span>
                    )}
                    <span
                      className={
                        isNearLimit(length, limits.max)
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {formatCharCount(length, limits.max)}
                    </span>
                  </div>
                </div>
              </FieldAccordionItem>
            );
          })}
        </FieldAccordion>
      </div>
    </div>
  );
}
