import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useS3Upload } from "@/hooks/useS3Upload";
import { useReplaceConnectorResume } from "@/hooks/useReplaceConnectorResume";
import { ResumeUploadField } from "@/components/recruitment/ResumeUploadField";
import type { ReplaceResumeTarget } from "@/lib/recruitment/connector-replace-resume.utils";
import {
  connectorReplaceResumeSchema,
  type ConnectorReplaceResumeFormValues,
} from "@/schemas/connector-replace-resume";
import { Loader2, RefreshCw } from "lucide-react";

function ReplaceResumeWhatHappens({
  kind,
}: {
  kind: ReplaceResumeTarget["kind"];
}) {
  const items =
    kind === "referred"
      ? [
          "AI re-analyzes the new resume against this job",
          "Their existing application may move between In Review and Not Qualified",
          "No new consent email is sent — they already accepted",
        ]
      : [
          "AI re-analyzes the new resume against this job",
          "A score of 50% or higher moves them to Consent Pending and sends a consent email",
          "Below 50% they stay or move to Not Qualified; any previous consent link stops working",
        ];

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <div className="mb-1 flex items-center gap-2 font-medium">
        <RefreshCw className="h-4 w-4 shrink-0" />
        What happens when you update
      </div>
      <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-amber-800">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

interface ConnectorReplaceResumeModalProps {
  target: ReplaceResumeTarget | null;
  onOpenChange: (open: boolean) => void;
}

export function ConnectorReplaceResumeModal({
  target,
  onOpenChange,
}: ConnectorReplaceResumeModalProps) {
  const { toast } = useToast();
  const { upload, isUploading } = useS3Upload({
    folder: "resumes",
    accessControl: "none",
  });
  const replaceMutation = useReplaceConnectorResume();
  const form = useForm<ConnectorReplaceResumeFormValues>({
    defaultValues: { resumeFile: undefined, piiConsent: false },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ resumeFile: undefined, piiConsent: false });
    }
    onOpenChange(open);
  };

  const onSubmit = async (values: ConnectorReplaceResumeFormValues) => {
    if (!target) return;
    let uploadResult: Awaited<ReturnType<typeof upload>>;
    try {
      uploadResult = await upload(values.resumeFile as File);
    } catch (error) {
      form.setError("resumeFile", {
        message: "Resume upload failed, please try again.",
      });
      toast({
        title: "Could not update resume",
        description:
          (error as Error)?.message ||
          "Something went wrong. Please try again.",
        variant: "destructive",
      });
      return;
    }
    if (!uploadResult) {
      form.setError("resumeFile", {
        message: "Resume upload failed, please try again.",
      });
      return;
    }

    replaceMutation.mutate(
      {
        matchId:
          target.kind === "pool"
            ? target.matchId
            : (target.matchId ?? undefined),
        candidateId:
          target.kind === "referred" ? target.candidateId : undefined,
        resume: {
          fileName: uploadResult.fileName,
          filePath: uploadResult.filePath,
          mimeType: uploadResult.mimeType,
          fileType: uploadResult.fileType,
          size: uploadResult.size,
        },
        piiConsent: true,
      },
      {
        onSuccess: () => {
          toast({
            title: "Resume update queued",
            description:
              "The new resume is being analyzed. Refresh the board to see updates.",
          });
          handleOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Could not update resume",
            description:
              (error as Error)?.message ||
              "Something went wrong. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = form.getValues();
    const parsed = connectorReplaceResumeSchema.safeParse(values);
    if (!parsed.success) {
      form.clearErrors();
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "resumeFile" || field === "piiConsent") {
          form.setError(field, { message: issue.message });
        }
      }
      return;
    }
    await onSubmit(parsed.data);
  };

  const isSubmitting = isUploading || replaceMutation.isPending;

  return (
    <Dialog open={Boolean(target)} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update resume</DialogTitle>
          <DialogDescription>
            Upload a new PDF for{" "}
            <span className="font-medium text-foreground">
              {target?.candidateName}
            </span>
            {target?.jobTitle ? (
              <>
                {" "}
                on <span className="font-medium">{target.jobTitle}</span>
              </>
            ) : null}
            . AI will re-analyze the resume and move the candidate to the
            appropriate column.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="resumeFile"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <ResumeUploadField
                      file={field.value}
                      onChange={(file) => {
                        field.onChange(file);
                        form.clearErrors("resumeFile");
                      }}
                      error={fieldState.error?.message}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="piiConsent"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Checkbox
                        id="replace-pii-consent"
                        checked={field.value === true}
                        onCheckedChange={(checked) => {
                          field.onChange(checked === true);
                          if (checked === true) {
                            form.clearErrors("piiConsent");
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel
                      htmlFor="replace-pii-consent"
                      className="text-sm leading-snug text-muted-foreground"
                    >
                      I confirm I have the candidate&apos;s permission to share
                      their resume for this job.
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {target ? <ReplaceResumeWhatHappens kind={target.kind} /> : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? "Updating…" : "Update & re-analyze"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
