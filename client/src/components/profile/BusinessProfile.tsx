import { Building, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

interface BusinessProfileProps {
  profile: {
    products?: string;
    uniqueSellingProposition?: string;
    targetMarket?: string;
    companySize?: string;
    revenueRange?: string;
    keyCredentials?: string;
  };
  onProfileChange?: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

export interface BusinessProfileHandle {
  getFormValues: () => {
    products: string;
    uniqueSellingProposition: string;
    targetMarket: string;
    companySize: string;
    revenueRange: string;
    keyCredentials: string;
  };
  validateForm: (errors?: Record<string, string>) => void;
}

export const BusinessProfile = forwardRef<
  BusinessProfileHandle,
  BusinessProfileProps
>(function BusinessProfile(
  { profile, onProfileChange, errors: externalErrors },
  ref
) {
  // Local state for all form fields
  const [formState, setFormState] = useState({
    products: profile.products || "",
    uniqueSellingProposition: profile.uniqueSellingProposition || "",
    targetMarket: profile.targetMarket || "",
    companySize: profile.companySize || "",
    revenueRange: profile.revenueRange || "",
    keyCredentials: profile.keyCredentials || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>(
    externalErrors || {}
  );

  // Track if form has been modified to prevent resetting user input
  const isDirtyRef = useRef(false);
  const prevValuesRef = useRef<typeof formState | null>(null);
  const isInitialMount = useRef(true);
  const formStateRef = useRef(formState);

  // Keep formStateRef in sync with formState
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  // Initialize prevValuesRef on mount to track initial state
  useEffect(() => {
    prevValuesRef.current = { ...formState };
    isInitialMount.current = false;
  }, []);

  // Update local state when props change (but only if form hasn't been modified)
  useEffect(() => {
    const newState = {
      products: profile.products || "",
      uniqueSellingProposition: profile.uniqueSellingProposition || "",
      targetMarket: profile.targetMarket || "",
      companySize: profile.companySize || "",
      revenueRange: profile.revenueRange || "",
      keyCredentials: profile.keyCredentials || "",
    };

    // Check if current state matches new props (e.g., after save)
    const currentState = formStateRef.current;
    const stateMatchesProps =
      currentState.products === newState.products &&
      currentState.uniqueSellingProposition ===
        newState.uniqueSellingProposition &&
      currentState.targetMarket === newState.targetMarket &&
      currentState.companySize === newState.companySize &&
      currentState.revenueRange === newState.revenueRange &&
      currentState.keyCredentials === newState.keyCredentials;

    // If state matches props, reset dirty flag (values were saved)
    if (stateMatchesProps) {
      isDirtyRef.current = false;
    }

    // Only update state if form hasn't been modified (to prevent resetting user input)
    if (!isDirtyRef.current) {
      setFormState(newState);
    }
  }, [profile]);

  // Update errors when externalErrors prop changes
  useEffect(() => {
    if (externalErrors) {
      setErrors(externalErrors);
    }
  }, [externalErrors]);

  // Sync local state changes to parent component
  useEffect(() => {
    // Skip sync on initial mount to avoid unnecessary parent updates
    if (isInitialMount.current) {
      return;
    }

    // Only sync fields that have actually changed
    if (onProfileChange && prevValuesRef.current !== null) {
      Object.entries(formState).forEach(([field, value]) => {
        const prevValue =
          prevValuesRef.current?.[field as keyof typeof formState];
        if (prevValue !== value) {
          onProfileChange(field, value || "");
        }
      });
    }
    // Update ref for next comparison
    prevValuesRef.current = { ...formState };
  }, [formState, onProfileChange]);

  const handleChange = (field: string, value: string) => {
    isDirtyRef.current = true;
    setFormState((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Expose current form values and validation method so parent components can access them
  useImperativeHandle(
    ref,
    () => ({
      getFormValues: () => formState,
      validateForm: (validationErrors?: Record<string, string>) => {
        if (validationErrors) {
          setErrors(validationErrors);
        }
      },
    }),
    [formState]
  );

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-sky/10 text-brand-sky">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-extrabold tracking-tight">
              Business Profile
            </CardTitle>
            <CardDescription>
              Your company and professional credentials
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div>
          <Label htmlFor="products">Products/Services You Sell</Label>
          <Textarea
            id="products"
            value={formState.products}
            onChange={(e) => handleChange("products", e.target.value)}
            placeholder="Describe the products or services your company offers..."
            rows={3}
            maxLength={500}
            className={
              errors.products ? "border-red-500 focus:border-red-500" : ""
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formState.products.length}/500 characters
          </p>
          {errors.products && (
            <div className="flex items-center text-sm text-red-600 mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.products}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="uniqueSellingProposition">
            Why Customers Choose Your Product/Service Over The Competition?
          </Label>
          <Textarea
            id="uniqueSellingProposition"
            value={formState.uniqueSellingProposition}
            onChange={(e) =>
              handleChange("uniqueSellingProposition", e.target.value)
            }
            placeholder="What makes your offering unique? Include specific benefits, metrics, or differentiators..."
            rows={3}
            maxLength={300}
            className={
              errors.uniqueSellingProposition
                ? "border-red-500 focus:border-red-500"
                : ""
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formState.uniqueSellingProposition.length}/300 characters
          </p>
          {errors.uniqueSellingProposition && (
            <div className="flex items-center text-sm text-red-600 mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.uniqueSellingProposition}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="targetMarket">Target Market</Label>
          <Textarea
            id="targetMarket"
            value={formState.targetMarket}
            onChange={(e) => handleChange("targetMarket", e.target.value)}
            placeholder="Describe your ideal customers (company size, industry, role, etc.)..."
            rows={2}
            maxLength={300}
            className={
              errors.targetMarket ? "border-red-500 focus:border-red-500" : ""
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formState.targetMarket.length}/300 characters
          </p>
          {errors.targetMarket && (
            <div className="flex items-center text-sm text-red-600 mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.targetMarket}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="companySize">Company Size</Label>
            <Select
              value={formState.companySize}
              onValueChange={(value) => handleChange("companySize", value)}
            >
              <SelectTrigger
                className={
                  errors.companySize
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
              >
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10 employees</SelectItem>
                <SelectItem value="11-50">11-50 employees</SelectItem>
                <SelectItem value="51-200">51-200 employees</SelectItem>
                <SelectItem value="201-500">201-500 employees</SelectItem>
                <SelectItem value="501-1000">501-1000 employees</SelectItem>
                <SelectItem value="1000+">1000+ employees</SelectItem>
              </SelectContent>
            </Select>
            {errors.companySize && (
              <div className="flex items-center text-sm text-red-600 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.companySize}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="revenueRange">Annual Revenue</Label>
            <Select
              value={formState.revenueRange}
              onValueChange={(value) => handleChange("revenueRange", value)}
            >
              <SelectTrigger
                className={
                  errors.revenueRange
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
              >
                <SelectValue placeholder="Select annual revenue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<$1M">Less than $1M</SelectItem>
                <SelectItem value="$1M-$5M">$1M - $5M</SelectItem>
                <SelectItem value="$5M-$10M">$5M - $10M</SelectItem>
                <SelectItem value="$10M-$50M">$10M - $50M</SelectItem>
                <SelectItem value="$50M-$100M">$50M - $100M</SelectItem>
                <SelectItem value="$100M+">$100M+</SelectItem>
              </SelectContent>
            </Select>
            {errors.revenueRange && (
              <div className="flex items-center text-sm text-red-600 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.revenueRange}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="keyCredentials">
            Key Credentials & Professional Background
          </Label>
          <Textarea
            id="keyCredentials"
            value={formState.keyCredentials}
            onChange={(e) => handleChange("keyCredentials", e.target.value)}
            placeholder="List your key credentials, certifications, awards, or notable professional accomplishments..."
            rows={4}
            className={
              errors.keyCredentials ? "border-red-500 focus:border-red-500" : ""
            }
            maxLength={800}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formState.keyCredentials.length}/800 characters
          </p>
          {errors.keyCredentials && (
            <div className="flex items-center text-sm text-red-600 mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.keyCredentials}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
