import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

export function CreateDisputeFormTextarea() {
  const form = useFormContext();

  return (
    <>
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2 text-foreground">
              Reason <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground font-normal">
                <FormDescription>(minimum 50 characters)</FormDescription>
              </span>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="Explain the issue in detail..."
                className="min-h-[120px] rounded-md"
                {...field}
              />
            </FormControl>

            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="expectedOutcome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Expected Outcome</FormLabel>
            <FormControl>
              <Textarea
                placeholder="What would be a fair resolution for you?"
                className="min-h-[80px] rounded-md"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
