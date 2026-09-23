import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ClipboardCheck, X } from "lucide-react";
import type { KanbanCandidate } from "@/pages/recruitment/job-kanban/types";
import {
  interviewOutcomeSchema,
  type InterviewOutcomeFormValues,
} from "@/schemas/interview-outcome.schema";
import {
  OUTCOME_OPTIONS,
  type OutcomeValue,
} from "@/constants/interview-outcomes";

interface InterviewOutcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: KanbanCandidate | null;
  onConfirm: (
    outcome: OutcomeValue,
    comment: string,
    options?: { onSuccess?: () => void }
  ) => void;
  isPending?: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export default function InterviewOutcomeDialog({
  open,
  onOpenChange,
  candidate,
  onConfirm,
  isPending,
  errorMessage,
  onClearError,
}: InterviewOutcomeDialogProps) {
  const form = useForm<InterviewOutcomeFormValues>({
    resolver: zodResolver(interviewOutcomeSchema),
    defaultValues: {
      outcome: undefined,
      comment: "",
    },
  });

  const outcome = form.watch("outcome");
  const comment = form.watch("comment") ?? "";
  const commentRequired = outcome === "no_show" || outcome === "cancelled";

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  if (!candidate) return null;

  const handleClose = (value: boolean) => {
    onOpenChange(value);
  };

  const onSubmit = (data: InterviewOutcomeFormValues) => {
    onConfirm(data.outcome, data.comment.trim(), {
      onSuccess: () => {
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg max-sm:rounded-none"
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
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
              Mark Interview Outcome
            </DialogTitle>
          </div>
          <DialogDescription className="relative mt-2 text-[13px] leading-relaxed text-white/90">
            Select the interview outcome for{" "}
            <b className="font-extrabold text-white">{candidate.anonymousId}</b>
            .
          </DialogDescription>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-bold">
                      Outcome <span className="text-brand-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(val) => {
                        field.onChange(val);
                        onClearError?.();
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select outcome..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OUTCOME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {outcome && (
                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-bold">
                        Comment{" "}
                        {commentRequired && (
                          <span className="text-brand-destructive">*</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={
                            commentRequired
                              ? "Please provide a reason..."
                              : "Optional comment..."
                          }
                          rows={3}
                          maxLength={500}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-right text-xs text-muted-foreground">
                        {comment.length}/500
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {errorMessage && (
                <p className="rounded-xl border border-brand-destructive/20 bg-brand-destructive/10 px-3.5 py-2.5 text-sm text-brand-destructive">
                  {errorMessage}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-border bg-background px-6 py-4 max-sm:[&>button]:flex-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-brand-gradient text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
              >
                {isPending ? "Submitting..." : "Confirm Outcome"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
