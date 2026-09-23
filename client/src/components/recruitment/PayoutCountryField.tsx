import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYOUT_COUNTRIES } from "@/lib/stripe-connect";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

interface PayoutCountryFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  required?: boolean;
}

export function PayoutCountryField({
  value,
  onChange,
  error,
  required = true,
}: PayoutCountryFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="payout-country" className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        Country
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger
          id="payout-country"
          className={cn(
            "h-11",
            error &&
              "border-destructive focus:ring-1 focus:ring-destructive focus:ring-offset-0"
          )}
          aria-invalid={!!error}
        >
          <SelectValue placeholder="Select your country" />
        </SelectTrigger>
        <SelectContent>
          {PAYOUT_COUNTRIES.map((country) => (
            <SelectItem key={country.value} value={country.value}>
              {country.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p className="text-sm font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
