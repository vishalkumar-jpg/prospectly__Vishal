import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DISPUTE_TYPES, DISPUTE_TYPE_LABELS } from "@/types/dispute";

export function FileDisputeModalStep2Form() {
  const form = useFormContext();

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="disputeType"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-foreground">
              Dispute Type <span className="text-destructive">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger id="disputeType">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DISPUTE_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {DISPUTE_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-foreground">
              Reason *{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (min 50 characters)
              </span>
            </FormLabel>
            <FormControl>
              <Textarea
                id="reason"
                placeholder="Explain the issue in detail..."
                rows={5}
                className="resize-none"
                {...field}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground mt-1">
              {field.value?.length || 0} / 50 characters (minimum required: 50)
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="expectedOutcome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Expected Outcome (Optional)</FormLabel>
            <FormControl>
              <Textarea
                id="expectedOutcome"
                placeholder="What outcome are you hoping for?"
                rows={3}
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="disputedAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">
                Disputed Amount ($) <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  id="disputedAmount"
                  type="text"
                  inputMode="decimal"
                  placeholder=""
                  maxLength={8}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      if (value.length <= 8 && !value.includes("-")) {
                        field.onChange(value === "" ? undefined : value);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "-" ||
                      e.key === "e" ||
                      e.key === "E" ||
                      e.key === "+"
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="mt-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requestedRefundAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">
                Refund Requested ($) <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  id="refundAmount"
                  type="text"
                  inputMode="decimal"
                  placeholder=""
                  maxLength={8}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      if (value.length <= 8 && !value.includes("-")) {
                        field.onChange(value === "" ? undefined : value);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "-" ||
                      e.key === "e" ||
                      e.key === "E" ||
                      e.key === "+"
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="mt-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
