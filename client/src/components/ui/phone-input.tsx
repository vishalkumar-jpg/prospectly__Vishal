import * as React from "react";
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import countryCodes from "@/data/country-codes.json";
import { Check, ChevronsUpDown } from "lucide-react";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  error?: boolean;
  "data-private"?: string | boolean; // Add data-private support
}

// Function to get flag emoji from country code
const getCountryFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Helper function to detect country for shared dial codes (e.g., "+1" for US/CA)
const detectCountryForSharedDialCode = (
  phoneValue: string,
  dialCode: string
): string | null => {
  if (dialCode !== "+1") {
    return null;
  }

  try {
    const parsedUS = parsePhoneNumber(phoneValue, "US");
    if (
      parsedUS &&
      parsedUS.country === "US" &&
      isValidPhoneNumber(phoneValue, "US")
    ) {
      return "US";
    }
  } catch {
    // Continue to try CA
  }

  try {
    const parsedCA = parsePhoneNumber(phoneValue, "CA");
    if (
      parsedCA &&
      parsedCA.country === "CA" &&
      isValidPhoneNumber(phoneValue, "CA")
    ) {
      return "CA";
    }
  } catch {
    // Neither worked
  }

  return null;
};

// Helper to find country by dial code, handling shared dial codes
const findCountryByDialCode = (
  rawValue: string
): { country: string; numberPart: string } | null => {
  const matchedCountry = countryCodes.find((c) =>
    rawValue.startsWith(c.dialCode)
  );

  if (!matchedCountry) {
    return null;
  }

  const detectedCountry = detectCountryForSharedDialCode(
    rawValue,
    matchedCountry.dialCode
  );

  if (detectedCountry) {
    const countryData = countryCodes.find((c) => c.code === detectedCountry);
    if (countryData) {
      return {
        country: detectedCountry,
        numberPart: rawValue.replace(countryData.dialCode, "").trim(),
      };
    }
  }

  return {
    country: matchedCountry.code,
    numberPart: rawValue.replace(matchedCountry.dialCode, "").trim(),
  };
};

const PhoneInputComponent = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      className,
      disabled,
      placeholder,
      error,
      "data-private": dataPrivate,
    },
    ref
  ) => {
    const phoneInputRef = React.useRef<HTMLInputElement>(null);
    const [selectedCountry, setSelectedCountry] = React.useState<string>("US");
    const [phoneNumber, setPhoneNumber] = React.useState<string>("");
    const [open, setOpen] = React.useState(false);

    // Track if country was explicitly selected by user to prevent auto-detection override
    const userSelectedCountryRef = React.useRef<boolean>(false);
    // Track if this is the initial mount
    const isInitialMountRef = React.useRef<boolean>(true);

    // Parse initial value to extract country and number - only on initial mount
    // After that, only update phoneNumber, not country (to respect user's explicit selection)
    React.useEffect(() => {
      if (!value || !value.trim()) {
        setPhoneNumber("");
        return;
      }

      const currentCountryData = countryCodes.find(
        (c) => c.code === selectedCountry
      );
      const currentDialCode = currentCountryData?.dialCode || "+1";

      // If user explicitly selected a country and the value starts with that dial code,
      // just update the phone number portion without changing the country
      if (userSelectedCountryRef.current && value.startsWith(currentDialCode)) {
        setPhoneNumber(value.replace(currentDialCode, "").trim());
        return;
      }

      // Only run full country detection on initial mount or when dial code changes
      if (!isInitialMountRef.current && value.startsWith(currentDialCode)) {
        setPhoneNumber(value.replace(currentDialCode, "").trim());
        return;
      }

      isInitialMountRef.current = false;

      // Try parsePhoneNumber first
      try {
        const parsed = parsePhoneNumber(value);
        if (parsed && parsed.country) {
          setSelectedCountry(parsed.country);
          setPhoneNumber(parsed.nationalNumber || "");
          return;
        }
      } catch {
        // Fall through to helper-driven fallback
      }

      // Fall back to dial code matching helper
      const result = findCountryByDialCode(value);
      if (result) {
        setSelectedCountry(result.country);
        setPhoneNumber(result.numberPart);
      }
    }, [value, selectedCountry]);

    // Forward ref to phone input
    React.useImperativeHandle(ref, () => phoneInputRef.current!);

    const selectedCountryData =
      countryCodes.find((c) => c.code === selectedCountry) || countryCodes[0];

    const handleCountryChange = (countryCode: string) => {
      // Mark that user explicitly selected this country
      userSelectedCountryRef.current = true;
      setSelectedCountry(countryCode);
      setOpen(false);
      const country = countryCodes.find((c) => c.code === countryCode);
      if (country) {
        // Update the full phone number with new country code
        const fullNumber = phoneNumber
          ? `${country.dialCode}${phoneNumber}`
          : "";
        onChange?.(fullNumber);
      }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const number = e.target.value.replace(/\D/g, ""); // Remove non-digits
      setPhoneNumber(number);

      const country = countryCodes.find((c) => c.code === selectedCountry);
      if (country) {
        const fullNumber = number ? `${country.dialCode}${number}` : "";
        onChange?.(fullNumber);
      }
    };

    const handleBlur = () => {
      onBlur?.();
    };

    return (
      <div className={cn("flex gap-0", className)}>
        {/* Country Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Select country, ${selectedCountryData.name} ${selectedCountryData.dialCode}`}
              aria-haspopup="listbox"
              aria-expanded={open}
              className={cn(
                "w-[140px] h-10 rounded-r-none border-r-0 border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-between",
                error && "border-destructive focus:border-destructive"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {getCountryFlag(selectedCountryData.code)}
                </span>
                <span className="text-sm font-medium">
                  {selectedCountryData.dialCode}
                </span>
              </div>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {countryCodes.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.dialCode} ${country.code}`}
                      onSelect={() => handleCountryChange(country.code)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-lg">
                          {getCountryFlag(country.code)}
                        </span>
                        <span className="font-medium">{country.dialCode}</span>
                        <span className="flex-1">{country.name}</span>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          selectedCountry === country.code
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Phone Number Input */}
        <Input
          ref={phoneInputRef}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder || "Enter phone number"}
          data-private={dataPrivate}
          className={cn(
            "flex-1 rounded-l-none h-10",
            error && "border-destructive focus-visible:border-input"
          )}
        />
      </div>
    );
  }
);

PhoneInputComponent.displayName = "PhoneInput";

export { PhoneInputComponent as PhoneInput };
