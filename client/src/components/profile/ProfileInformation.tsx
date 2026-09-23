import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { User, Mail, Sparkles, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  profileInformationSchema,
  type ProfileInformationFormData,
} from "@/schemas/profile-information.schema";
import { PAYOUT_COUNTRIES } from "@/lib/stripe-connect";

interface ProfileInformationProps {
  profile: {
    firstName?: string;
    lastName?: string;
    title?: string;
    jobTitle?: string;
    company?: string;
    industry?: string;
    location?: string;
    country?: string;
    bio?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    websiteUrl?: string;
    isUserUnsubscribe?: boolean;
  };
  onProfileUpdate?: (
    updatedProfile: Partial<ProfileInformationFormData>
  ) => void;
  onFormChange?: (field: string, value: string | boolean) => void;
  highlightField?: string | null;
  isHighlightActive?: boolean;
  errors?: Record<string, string>;
}

export interface ProfileInformationHandle {
  getFormValues: () => ProfileInformationFormData;
  validateForm: () => boolean;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  location?: string;
  country?: string;
  bio?: string;
  phone?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
}

export const ProfileInformation = forwardRef<
  ProfileInformationHandle,
  ProfileInformationProps
>(function ProfileInformation(
  {
    profile,
    onProfileUpdate,
    onFormChange,
    highlightField,
    isHighlightActive = false,
    errors: externalErrors,
  },
  ref
) {
  const { toast } = useToast();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const linkedinInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<ValidationErrors>(externalErrors || {});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errorsRef = useRef<ValidationErrors>(externalErrors || {});

  const form = useForm<ProfileInformationFormData>({
    resolver: zodResolver(profileInformationSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: {
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      jobTitle: profile.jobTitle || profile.title || "",
      company: profile.company || "",
      industry: profile.industry || "",
      location: profile.location || "",
      country: profile.country || "",
      bio: profile.bio || "",
      phone: profile.phone || "",
      linkedinUrl: profile.linkedinUrl || "",
      websiteUrl: profile.websiteUrl || "",
      isUserUnsubscribe: profile.isUserUnsubscribe ?? false,
    },
  });

  const validateAllFields = (): boolean => {
    const allFormValues = form.getValues();

    const formData = {
      firstName: (allFormValues.firstName || "").trim(),
      lastName: (allFormValues.lastName || "").trim(),
      jobTitle: (allFormValues.jobTitle || "").trim(),
      company: (allFormValues.company || "").trim(),
      industry: (allFormValues.industry || "").trim(),
      location: (allFormValues.location || "").trim(),
      country: (allFormValues.country || "").trim(),
      bio: (allFormValues.bio || "").trim(),
      phone: (allFormValues.phone || "").trim(),
      linkedinUrl: (allFormValues.linkedinUrl || "").trim(),
      websiteUrl: (allFormValues.websiteUrl || "").trim(),
      isUserUnsubscribe: allFormValues.isUserUnsubscribe,
    };

    const result = profileInformationSchema.safeParse(formData);

    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: ValidationErrors = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as keyof ValidationErrors;
      if (field && !newErrors[field]) {
        newErrors[field] = issue.message;
      }
    });

    setErrors(newErrors);
    const allFields = [
      "firstName",
      "lastName",
      "jobTitle",
      "company",
      "industry",
      "location",
      "country",
      "bio",
      "phone",
      "linkedinUrl",
      "websiteUrl",
    ];
    const touchedFields: Record<string, boolean> = {};
    allFields.forEach((field) => {
      touchedFields[field] = true;
    });
    setTouched(touchedFields);

    return false;
  };

  // Keep errorsRef in sync with errors state
  useEffect(() => {
    errorsRef.current = errors;
  }, [errors]);

  // Update errors when externalErrors prop changes
  // Preserve errors when external errors are provided, clear when they're cleared
  useEffect(() => {
    if (externalErrors !== undefined) {
      // If externalErrors is provided (even if empty object), use it
      // This allows parent to clear errors by passing empty object
      setErrors(externalErrors);
      errorsRef.current = externalErrors;
    }
    // If externalErrors is undefined, don't update (preserve local errors)
  }, [externalErrors]);

  useImperativeHandle(
    ref,
    () => ({
      getFormValues: () => form.getValues(),
      validateForm: () => {
        return validateAllFields();
      },
    }),
    [form]
  );

  // Update form when profile changes (but don't reset if form has unsaved changes)
  // Preserve errors if they exist (from validation failures)
  useEffect(() => {
    // Only reset if the form hasn't been modified (to prevent resetting user input)
    // AND if there are no active validation errors
    const hasActiveErrors = Object.keys(errorsRef.current).length > 0;
    if (!form.formState.isDirty && !hasActiveErrors) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        jobTitle: profile.jobTitle || profile.title || "",
        company: profile.company || "",
        industry: profile.industry || "",
        location: profile.location || "",
        country: profile.country || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        linkedinUrl: profile.linkedinUrl || "",
        websiteUrl: profile.websiteUrl || "",
        isUserUnsubscribe: profile.isUserUnsubscribe ?? false,
      });
    }
  }, [profile, form]);

  // Watch all form values and sync to parent state (similar to BusinessProfile)
  // This ensures unsaved changes persist when switching tabs
  const watchedValues = form.watch();
  const prevValuesRef = useRef<ProfileInformationFormData | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Initialize ref on first mount
    if (isInitialMount.current) {
      prevValuesRef.current = { ...watchedValues };
      isInitialMount.current = false;
      return;
    }

    // Only sync fields that have actually changed (skip initial mount)
    if (onFormChange && prevValuesRef.current !== null) {
      Object.entries(watchedValues).forEach(([field, value]) => {
        const prevValue =
          prevValuesRef.current?.[field as keyof ProfileInformationFormData];
        if (prevValue !== value) {
          onFormChange(field, value ?? "");
        }
      });
    }
    // Update ref for next comparison
    prevValuesRef.current = { ...watchedValues };
  }, [watchedValues, onFormChange]);

  // Handle field highlighting
  useEffect(() => {
    if (highlightField) {
      setTimeout(() => {
        const refs: Record<string, React.RefObject<HTMLInputElement>> = {
          email: emailInputRef,
          phone: phoneInputRef,
          linkedin: linkedinInputRef,
        };

        const ref = refs[highlightField];
        if (ref?.current) {
          ref.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 300);
    }
  }, [highlightField]);

  const getHighlightClasses = (fieldName: string) => {
    if (highlightField === fieldName && isHighlightActive) {
      return "relative border-2 border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.3),0_0_20px_5px_rgba(59,130,246,0.2)] animate-pulse bg-blue-50/30 dark:bg-blue-950/30";
    }
    return "";
  };

  // Validate a single field using Zod schema (same pattern as SignUp)
  const validateField = (fieldName: string, value: string | boolean) => {
    const formData = {
      firstName:
        fieldName === "firstName"
          ? (value as string)
          : form.getValues("firstName")?.trim() || "",
      lastName:
        fieldName === "lastName"
          ? (value as string)
          : form.getValues("lastName")?.trim() || "",
      jobTitle:
        fieldName === "jobTitle"
          ? (value as string)
          : form.getValues("jobTitle")?.trim() || "",
      company:
        fieldName === "company"
          ? (value as string)
          : form.getValues("company")?.trim() || "",
      industry:
        fieldName === "industry"
          ? (value as string)
          : form.getValues("industry")?.trim() || "",
      location:
        fieldName === "location"
          ? (value as string)
          : form.getValues("location")?.trim() || "",
      country:
        fieldName === "country"
          ? (value as string)
          : form.getValues("country")?.trim() || "",
      bio:
        fieldName === "bio"
          ? (value as string)
          : form.getValues("bio")?.trim() || "",
      phone:
        fieldName === "phone"
          ? (value as string)
          : form.getValues("phone")?.trim() || "",
      linkedinUrl:
        fieldName === "linkedinUrl"
          ? (value as string)
          : form.getValues("linkedinUrl")?.trim() || "",
      websiteUrl:
        fieldName === "websiteUrl"
          ? (value as string)
          : form.getValues("websiteUrl")?.trim() || "",
      isUserUnsubscribe:
        fieldName === "isUserUnsubscribe"
          ? (value as boolean)
          : form.getValues("isUserUnsubscribe"),
    };

    const result = profileInformationSchema.safeParse(formData);

    if (result.success) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: undefined,
      }));
      return true;
    }

    // Extract field-specific error
    const fieldError = result.error.issues.find(
      (issue) => issue.path[0] === fieldName
    );

    setErrors((prev) => ({
      ...prev,
      [fieldName]: fieldError ? fieldError.message : undefined,
    }));

    return fieldError === undefined;
  };

  const bioLength = form.watch("bio")?.length || 0;

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
            <User className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-extrabold tracking-tight">
              Profile Information
            </CardTitle>
            <CardDescription>
              Your basic professional details visible to the network
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <Form {...form}>
          <form id="profile-information-form" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Validate if field has been touched (same as SignUp)
                          if (touched.firstName) {
                            validateField("firstName", e.target.value);
                          }
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          setTouched((prev) => ({ ...prev, firstName: true }));
                          validateField("firstName", e.target.value);
                        }}
                        className={
                          errors.firstName
                            ? "border-red-500 focus:border-red-500"
                            : ""
                        }
                      />
                    </FormControl>
                    {errors.firstName && (
                      <div className="flex items-center text-sm text-red-600 mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.firstName}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Validate if field has been touched (same as SignUp)
                          if (touched.lastName) {
                            validateField("lastName", e.target.value);
                          }
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          setTouched((prev) => ({ ...prev, lastName: true }));
                          validateField("lastName", e.target.value);
                        }}
                        className={
                          errors.lastName
                            ? "border-red-500 focus:border-red-500"
                            : ""
                        }
                      />
                    </FormControl>
                    {errors.lastName && (
                      <div className="flex items-center text-sm text-red-600 mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.lastName}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Validate if field has been touched (same as SignUp)
                        if (touched.jobTitle) {
                          validateField("jobTitle", e.target.value);
                        }
                      }}
                      onBlur={(e) => {
                        field.onBlur();
                        setTouched((prev) => ({ ...prev, jobTitle: true }));
                        validateField("jobTitle", e.target.value);
                      }}
                      placeholder="e.g. VP of Sales, Senior Developer"
                      className={
                        errors.jobTitle
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                    />
                  </FormControl>
                  {errors.jobTitle && (
                    <div className="flex items-center text-sm text-red-600 mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.jobTitle}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Validate if field has been touched (same as SignUp)
                          if (touched.company) {
                            validateField("company", e.target.value);
                          }
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          setTouched((prev) => ({ ...prev, company: true }));
                          validateField("company", e.target.value);
                        }}
                        className={
                          errors.company
                            ? "border-red-500 focus:border-red-500"
                            : ""
                        }
                      />
                    </FormControl>
                    {errors.company && (
                      <div className="flex items-center text-sm text-red-600 mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.company}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Validate if field has been touched (same as SignUp)
                        if (touched.industry) {
                          validateField("industry", value);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger
                          onBlur={() => {
                            field.onBlur();
                            setTouched((prev) => ({ ...prev, industry: true }));
                            validateField("industry", field.value || "");
                          }}
                          className={
                            errors.industry
                              ? "border-red-500 focus:border-red-500"
                              : ""
                          }
                        >
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SaaS">SaaS</SelectItem>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Real Estate">Real Estate</SelectItem>
                        <SelectItem value="Consulting">Consulting</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.industry && (
                      <div className="flex items-center text-sm text-red-600 mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.industry}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (touched.location) {
                            validateField("location", e.target.value);
                          }
                        }}
                        onBlur={(e) => {
                          field.onBlur();
                          setTouched((prev) => ({ ...prev, location: true }));
                          validateField("location", e.target.value);
                        }}
                        placeholder="e.g. San Francisco, CA"
                        className={
                          errors.location
                            ? "border-red-500 focus:border-red-500"
                            : ""
                        }
                      />
                    </FormControl>
                    {errors.location && (
                      <div className="flex items-center text-sm text-red-600 mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.location}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Country <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setTouched((prev) => ({ ...prev, country: true }));
                        validateField("country", value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger
                          onBlur={() => {
                            field.onBlur();
                            setTouched((prev) => ({ ...prev, country: true }));
                            validateField("country", field.value || "");
                          }}
                          className={
                            errors.country
                              ? "border-red-500 focus:border-red-500"
                              : ""
                          }
                        >
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYOUT_COUNTRIES.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.country && (
                      <div className="flex items-center text-sm text-red-600 mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.country}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Validate if field has been touched (same as SignUp)
                        if (touched.bio) {
                          validateField("bio", e.target.value);
                        }
                      }}
                      onBlur={(e) => {
                        field.onBlur();
                        setTouched((prev) => ({ ...prev, bio: true }));
                        validateField("bio", e.target.value);
                      }}
                      placeholder="Tell the community about your professional background and expertise..."
                      rows={3}
                      className={
                        errors.bio ? "border-red-500 focus:border-red-500" : ""
                      }
                      maxLength={500}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bioLength}/500 characters
                  </p>
                  {errors.bio && (
                    <div className="flex items-center text-sm text-red-600 mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.bio}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Information */}
            <div className="border-t pt-4 mt-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Contact Information
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="email"
                      className="flex items-center gap-2 mb-2"
                    >
                      Email Address
                      {highlightField === "email" && isHighlightActive && (
                        <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                      )}
                    </Label>
                    <Input
                      ref={emailInputRef}
                      id="email"
                      type="email"
                      value={profile.email || ""}
                      readOnly
                      disabled
                      className={getHighlightClasses("email")}
                      data-private="true"
                    />
                    {highlightField === "email" && isHighlightActive && (
                      <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Verifying your email earns you +2 Trust Score points and
                        the "Email Verified" badge!
                      </p>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Phone Number
                          {highlightField === "phone" && isHighlightActive && (
                            <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                          )}
                        </FormLabel>
                        <FormControl>
                          <PhoneInput
                            ref={phoneInputRef}
                            value={field.value || ""}
                            onChange={(value) => {
                              field.onChange(value);
                              // Validate if field has been touched (same as SignUp)
                              if (touched.phone) {
                                validateField("phone", value);
                              }
                            }}
                            onBlur={() => {
                              field.onBlur();
                              setTouched((prev) => ({ ...prev, phone: true }));
                              validateField("phone", field.value);
                            }}
                            className={getHighlightClasses("phone")}
                            error={!!errors.phone}
                            data-private="true"
                          />
                        </FormControl>
                        {errors.phone && (
                          <div className="flex items-center text-sm text-red-600 mt-1">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.phone}
                          </div>
                        )}
                        {highlightField === "phone" && isHighlightActive && (
                          <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Adding your phone number earns you +2 Trust Score
                            points and the "Phone Verified" badge!
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          LinkedIn Profile
                          {highlightField === "linkedin" &&
                            isHighlightActive && (
                              <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                            )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            ref={linkedinInputRef}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Validate if field has been touched (same as SignUp)
                              if (touched.linkedinUrl) {
                                validateField("linkedinUrl", e.target.value);
                              }
                            }}
                            onBlur={(e) => {
                              field.onBlur();
                              setTouched((prev) => ({
                                ...prev,
                                linkedinUrl: true,
                              }));
                              validateField("linkedinUrl", e.target.value);
                            }}
                            placeholder="https://linkedin.com/in/yourprofile"
                            className={`${getHighlightClasses("linkedin")} ${errors.linkedinUrl ? "border-red-500 focus:border-red-500" : ""}`}
                            data-private="true"
                          />
                        </FormControl>
                        {errors.linkedinUrl && (
                          <div className="flex items-center text-sm text-red-600 mt-1">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.linkedinUrl}
                          </div>
                        )}
                        {highlightField === "linkedin" && isHighlightActive && (
                          <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Connecting your LinkedIn earns you +3 Trust Score
                            points and the "LinkedIn Connected" badge!
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Validate if field has been touched (same as SignUp)
                              if (touched.websiteUrl) {
                                validateField("websiteUrl", e.target.value);
                              }
                            }}
                            onBlur={(e) => {
                              field.onBlur();
                              setTouched((prev) => ({
                                ...prev,
                                websiteUrl: true,
                              }));
                              validateField("websiteUrl", e.target.value);
                            }}
                            placeholder="https://yourcompany.com"
                            className={
                              errors.websiteUrl
                                ? "border-red-500 focus:border-red-500"
                                : ""
                            }
                          />
                        </FormControl>
                        {errors.websiteUrl && (
                          <div className="flex items-center text-sm text-red-600 mt-1">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {errors.websiteUrl}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
});
