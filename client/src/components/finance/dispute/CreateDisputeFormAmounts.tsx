import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function CreateDisputeFormAmounts() {
  const form = useFormContext();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                type="number"
                step="0.01"
                placeholder="0.00"
                {...field}
                value={field.value ?? ""}
                readOnly
                className="rounded-md bg-muted cursor-not-allowed [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
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
                type="number"
                step="0.01"
                min="0"
                max="99999999"
                placeholder="0.00"
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*(?:\.\d{0,2})?$/.test(value)) {
                    const parts = value.split(".");
                    if (parts[0].length <= 8) {
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
                className="rounded-md [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
