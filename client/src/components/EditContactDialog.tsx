import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, DollarSign, UserPen, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { MaskedContact } from "@/hooks/useSecureContacts";
import { editContactSchema } from "@/schemas/edit-contact.schema";
import type { ZodIssue } from "zod";
import { AnyType } from "@/types/common";

interface EditContactDialogProps {
  contact: MaskedContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const DUPLICATE_EMAIL_ERROR_PATTERNS = [
  "already associated",
  "already in use",
  "already exists",
  "cannot be updated",
] as const;

const EMAIL_REQUIRED_MESSAGE = "Email is required";
const MAX_BOUNTY_AMOUNT = 999999;

function isDuplicateEmailError({
  errorMessage,
}: {
  errorMessage: string | undefined;
}): boolean {
  if (!errorMessage) return false;
  const lowerMessage = errorMessage.toLowerCase();
  return DUPLICATE_EMAIL_ERROR_PATTERNS.some((pattern) =>
    lowerMessage.includes(pattern)
  );
}

function validateEstimatedValueInput({
  estimatedValue,
}: {
  estimatedValue: string;
}): { ok: true } | { ok: false; message: string } {
  if (!estimatedValue || estimatedValue.trim() === "") {
    return { ok: false, message: "Please enter an estimated value." };
  }
  const value = parseFloat(estimatedValue);
  if (isNaN(value)) {
    return { ok: false, message: "Please enter a valid number." };
  }
  if (!Number.isInteger(value)) {
    return {
      ok: false,
      message: "Estimated value must be a whole number (no decimals allowed).",
    };
  }
  if (value <= 0) {
    return { ok: false, message: "Estimated value must be greater than 0." };
  }
  if (value > MAX_BOUNTY_AMOUNT) {
    return {
      ok: false,
      message: `Estimated value cannot exceed $${MAX_BOUNTY_AMOUNT.toLocaleString()}.`,
    };
  }
  return { ok: true };
}

function clearValidatedFieldErrors({
  prev,
}: {
  prev: Record<string, string | undefined>;
}): Record<string, string | undefined> {
  const newErrors = { ...prev };
  const validatedFields = [
    "firstName",
    "lastName",
    "email",
    "company",
    "title",
    "linkedin",
  ];
  for (const field of validatedFields) {
    if (
      field === "email" &&
      isDuplicateEmailError({ errorMessage: newErrors.email })
    ) {
      continue;
    }
    delete newErrors[field];
  }
  return newErrors;
}

type EditContactSaveBlocker =
  | {
      blocked: true;
      reason: "no_contact" | "email_field_error" | "email_required";
    }
  | { blocked: false };

function getEditContactSaveBlocker({
  contact,
  fieldErrors,
  hasEmail,
  email,
}: {
  contact: MaskedContact | null;
  fieldErrors: Record<string, string | undefined>;
  hasEmail: boolean;
  email: string;
}): EditContactSaveBlocker {
  if (!contact) return { blocked: true, reason: "no_contact" };
  if (fieldErrors.email) return { blocked: true, reason: "email_field_error" };
  if (!hasEmail && !email.trim()) {
    return { blocked: true, reason: "email_required" };
  }
  return { blocked: false };
}

function applyEditContactZodErrors({
  issues,
  setFieldErrors,
  setTouchedFields,
}: {
  issues: ZodIssue[];
  setFieldErrors: React.Dispatch<
    React.SetStateAction<Record<string, string | undefined>>
  >;
  setTouchedFields: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}): void {
  const errors: Record<string, string | undefined> = {};
  const touched: Record<string, boolean> = {};
  for (const issue of issues) {
    const field = String(issue.path[0]);
    errors[field] = issue.message;
    touched[field] = true;
  }
  setFieldErrors(errors);
  setTouchedFields((prev) => ({ ...prev, ...touched }));
}

function buildEditContactUpdatePayload({
  validatedData,
  hasEmail,
}: {
  validatedData: {
    firstName: string;
    lastName: string;
    company?: string;
    title?: string;
    linkedin?: string;
    email?: string;
  };
  hasEmail: boolean;
}): {
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  linkedin?: string;
  email?: string;
} {
  const updateData: {
    firstName?: string;
    lastName?: string;
    company?: string;
    title?: string;
    linkedin?: string;
    email?: string;
  } = {
    firstName: validatedData.firstName,
    lastName: validatedData.lastName,
    company: validatedData.company,
    title: validatedData.title,
    linkedin: validatedData.linkedin,
  };
  if (!hasEmail && validatedData.email) {
    updateData.email = validatedData.email;
  }
  for (const key of Object.keys(updateData)) {
    const fieldKey = key as keyof typeof updateData;
    if (updateData[fieldKey] === undefined) {
      delete updateData[fieldKey];
    }
  }
  return updateData;
}

function extractEditContactSaveError({ error }: { error: unknown }): {
  errorMessage: string;
  errorMessageLower: string;
  errorData: { code?: string; message?: string } | null;
} {
  const errorMessage =
    (error && typeof error === "object" && "response" in error
      ? (error.response as { data?: { message?: string } })?.data?.message
      : null) ||
    (error instanceof Error ? error.message : null) ||
    "Failed to update contact. Please try again.";
  const errorMessageLower = errorMessage?.toLowerCase() || "";
  const errorData =
    (error && typeof error === "object" && "data" in error
      ? (error as { data?: { code?: string; message?: string } })?.data
      : null) ||
    (error && typeof error === "object" && "response" in error
      ? (error.response as { data?: { code?: string; message?: string } })?.data
      : null);
  return { errorMessage, errorMessageLower, errorData };
}

function isEmailSaveError({
  errorMessageLower,
  errorData,
}: {
  errorMessageLower: string;
  errorData: { code?: string; message?: string } | null;
}): boolean {
  const emailErrorPhrases = [
    "email already exists",
    "email already in use",
    "email address cannot be updated",
    "email address is already associated with another contact",
  ];
  return (
    errorData?.code === "EMAIL_ALREADY_EXISTS" ||
    errorData?.code === "EMAIL_ALREADY_IN_USE" ||
    emailErrorPhrases.some((phrase) =>
      errorMessageLower.includes(phrase.toLowerCase())
    )
  );
}

export function EditContactDialog({
  contact,
  open,
  onOpenChange,
  onSuccess,
}: EditContactDialogProps) {
  // Form state for editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [hasEmail, setHasEmail] = useState(false);
  const [hasLinkedin, setHasLinkedin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string | undefined>
  >({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {}
  );
  const isInitializedRef = useRef(false);
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: Check if email field is required but empty
  const isEmailRequiredButEmpty = (fieldName: string, value: string) =>
    fieldName === "email" && !hasEmail && !value?.trim();

  // Validation helper function for individual fields
  const validateField = (fieldName: string, currentValue: string) => {
    // Don't validate during initial form initialization
    // Only validate if form is initialized OR field has been touched
    if (!isInitializedRef.current && !touchedFields[fieldName]) {
      return true;
    }

    // Skip email validation entirely when contact already has email
    if (fieldName === "email" && hasEmail) {
      // Clear any email errors when hasEmail is true
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
      return true;
    }

    // Check if email is required but empty (early return)
    if (isEmailRequiredButEmpty(fieldName, currentValue)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: EMAIL_REQUIRED_MESSAGE,
      }));
      return false;
    }

    // Check if current error is a duplicate email error (should be preserved)
    const currentDuplicateError =
      fieldName === "email" &&
      isDuplicateEmailError({ errorMessage: fieldErrors.email });

    // Validate individual field using schema shape
    const trimmedValue = currentValue.trim();
    const fieldSchema =
      editContactSchema.shape[
        fieldName as keyof typeof editContactSchema.shape
      ];
    const result = fieldSchema.safeParse(trimmedValue);

    if (!result.success) {
      // Field validation failed
      const fieldError = result.error.issues[0];
      if (fieldError) {
        // If there's a duplicate email error, preserve it instead of overwriting with format error
        if (currentDuplicateError && fieldName === "email") {
          // Keep the duplicate email error, don't overwrite it
          return false;
        }
        setFieldErrors((prev) => ({
          ...prev,
          [fieldName]: fieldError.message,
        }));
        return false;
      }
    }

    // Field format is valid, but preserve duplicate email errors
    if (currentDuplicateError) {
      // Keep the duplicate email error
      return false;
    }

    // Field is valid, clear its error
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    return true;
  };

  // Reset the form value when dialog opens or contact changes
  useEffect(() => {
    if (open && contact) {
      // Initialize editable fields from contact data
      setFirstName(contact.firstName || "");
      setLastName(contact.lastName || "");
      setCompany(contact.company || "");
      setTitle(contact.jobTitle || "");
      setLinkedin(contact.linkedinUrl || "");
      setHasLinkedin(!!contact.linkedinUrl);

      // Determine if email exists
      const emailExists = !!(contact.email || contact.email_masked);
      setHasEmail(emailExists);
      setEmail(emailExists ? contact.email || contact.email_masked || "" : "");

      // Initialize estimated value (bounty amount)
      const value = contact.bounty_amount;
      const numValue =
        typeof value === "number"
          ? value
          : typeof value === "string"
            ? parseFloat(value)
            : null;
      setEstimatedValue(
        numValue !== null && !isNaN(numValue) && numValue > 0
          ? String(numValue)
          : ""
      );
      setValidationError(""); // Clear validation error when dialog opens
      setFieldErrors({}); // Clear field errors when dialog opens
      setTouchedFields({}); // Clear touched fields when dialog opens

      // Mark form as initialized after a brief delay to ensure state updates complete
      // Use setTimeout to ensure this runs after all state updates
      setTimeout(() => {
        isInitializedRef.current = true;
      }, 0);
    } else {
      // Reset initialization flag when dialog closes
      isInitializedRef.current = false;
    }
  }, [open, contact]);

  // Clear errors when dialog closes
  useEffect(() => {
    if (!open) {
      setFieldErrors({});
      setTouchedFields({});
      setValidationError("");
      setIsCheckingEmail(false);
      isInitializedRef.current = false;

      // Clear email check timeout
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
        emailCheckTimeoutRef.current = null;
      }
    }
  }, [open]);

  // Check email availability (with debouncing)
  const checkEmailAvailability = useCallback(
    async (emailValue: string) => {
      if (!emailValue || !emailValue.trim() || hasEmail) {
        setIsCheckingEmail(false);
        return;
      }

      // Validate email format using schema before API call
      const formatResult = editContactSchema.shape.email.safeParse(
        emailValue.trim()
      );
      if (!formatResult.success) {
        setIsCheckingEmail(false);
        return;
      }

      setIsCheckingEmail(true);
      try {
        const result = await api.contacts.checkEmail(emailValue.trim());

        if (result.exists) {
          setFieldErrors((prev) => ({
            ...prev,
            email:
              result.message ||
              "This email address is already associated with another contact",
          }));
        } else {
          // Clear only duplicate-email errors, preserve format validation errors
          setFieldErrors((prev) => {
            const newErrors = { ...prev };
            if (isDuplicateEmailError({ errorMessage: newErrors.email })) {
              delete newErrors.email;
            }
            return newErrors;
          });
        }
      } catch {
        toast({
          title: "Error",
          description: "Could not verify email availability",
          variant: "destructive",
        });
      } finally {
        setIsCheckingEmail(false);
      }
    },
    [hasEmail, isDuplicateEmailError]
  );

  // Handle Estimated Value input - validate in real-time
  const handleEstimatedValueChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    // Prevent negative values, decimals, and non-numeric input (except empty string for clearing)
    if (value === "") {
      setEstimatedValue(value);
      setValidationError("");
      return;
    }

    // Only allow whole numbers (no decimal point) and check max
    const numValue = parseFloat(value);
    if (
      !isNaN(numValue) &&
      numValue >= 0 &&
      numValue <= 999999 &&
      !value.includes(".")
    ) {
      setEstimatedValue(value);
      setValidationError("");
    } else {
      // Don't update value if invalid, but show error
      if (value.includes(".")) {
        setValidationError(
          "Estimated value must be a whole number (no decimals allowed)."
        );
      } else if (!isNaN(numValue) && numValue > 999999) {
        setValidationError("Estimated value cannot exceed $999,999.");
      } else if (!isNaN(numValue) && numValue < 0) {
        setValidationError("Estimated value cannot be negative.");
      } else if (isNaN(numValue)) {
        setValidationError("Please enter a valid number.");
      }
    }
  };

  const handleSave = async () => {
    const blocker = getEditContactSaveBlocker({
      contact,
      fieldErrors,
      hasEmail,
      email,
    });
    if (blocker.blocked) {
      if (blocker.reason === "email_required") {
        setFieldErrors((prev) => ({ ...prev, email: EMAIL_REQUIRED_MESSAGE }));
        setTouchedFields((prev) => ({ ...prev, email: true }));
      }
      return;
    }

    const contactData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: !hasEmail && email.trim() ? email.trim() : "",
      company: company.trim() || "",
      title: title.trim() || "",
      linkedin: linkedin.trim() || "",
    };

    const result = editContactSchema.safeParse(contactData);
    if (!result.success) {
      applyEditContactZodErrors({
        issues: result.error.issues,
        setFieldErrors,
        setTouchedFields,
      });
      return;
    }

    setFieldErrors((prev) => clearValidatedFieldErrors({ prev }));

    const valueCheck = validateEstimatedValueInput({ estimatedValue });
    if (!valueCheck.ok) {
      setValidationError((valueCheck as { message: string }).message);
      return;
    }
    setValidationError("");

    setIsSubmitting(true);
    try {
      const updateData = buildEditContactUpdatePayload({
        validatedData: result.data as AnyType,
        hasEmail,
      });
      if (Object.keys(updateData).length > 0 && contact) {
        await api.contacts.update(parseInt(contact.id), updateData);
      }
      if (contact) {
        await api.contacts.updateBountyAmount(
          parseInt(contact.id),
          estimatedValue
        );
      }
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const { errorMessage, errorMessageLower, errorData } =
        extractEditContactSaveError({ error });
      const isEmailConflict =
        isEmailSaveError({ errorMessageLower, errorData }) &&
        !hasEmail &&
        email.trim();
      if (isEmailConflict) {
        setFieldErrors((prev) => ({
          ...prev,
          email:
            errorMessage ||
            "This email address is already associated with another contact",
        }));
        setTouchedFields((prev) => ({ ...prev, email: true }));
        return;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[700px]"
        mobileFullscreen
        hideCloseButton
      >
        {/* Hero */}
        <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
          />
          <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="relative flex items-center gap-3.5 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
              <UserPen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                Edit Contact
              </DialogTitle>
              <DialogDescription asChild>
                <div className="mt-1 truncate text-[13px] leading-relaxed text-white/90">
                  {[contact.firstName, contact.lastName]
                    .filter(Boolean)
                    .join(" ") || "Update contact details"}
                </div>
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setFirstName(newValue);
                  // Validate in real-time if field has been touched
                  if (touchedFields.firstName) {
                    validateField("firstName", newValue);
                  }
                }}
                onBlur={() => {
                  setTouchedFields((prev) => ({ ...prev, firstName: true }));
                  validateField("firstName", firstName);
                }}
                className={
                  fieldErrors.firstName
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                data-testid="input-contact-first-name"
              />
              {fieldErrors.firstName && (
                <p className="text-sm font-medium text-destructive">
                  {fieldErrors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setLastName(newValue);
                  // Validate in real-time if field has been touched
                  if (touchedFields.lastName) {
                    validateField("lastName", newValue);
                  }
                }}
                onBlur={() => {
                  setTouchedFields((prev) => ({ ...prev, lastName: true }));
                  validateField("lastName", lastName);
                }}
                className={
                  fieldErrors.lastName
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                data-testid="input-contact-last-name"
              />
              {fieldErrors.lastName && (
                <p className="text-sm font-medium text-destructive">
                  {fieldErrors.lastName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
                {!hasEmail && <span className="text-destructive ml-1">*</span>}
                {hasEmail && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (cannot be changed)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setEmail(newValue);

                    // Clear email duplicate error when user starts typing
                    if (
                      isDuplicateEmailError({ errorMessage: fieldErrors.email })
                    ) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.email;
                        return newErrors;
                      });
                    }

                    // Validate in real-time if field has been touched (like firstName/lastName)
                    if (!hasEmail && touchedFields.email) {
                      validateField("email", newValue);
                    }

                    // Check email availability with debouncing (only if format is valid)
                    if (!hasEmail && newValue.trim()) {
                      // Clear previous timeout
                      if (emailCheckTimeoutRef.current) {
                        clearTimeout(emailCheckTimeoutRef.current);
                      }

                      // Set new timeout for debounced check
                      emailCheckTimeoutRef.current = setTimeout(() => {
                        checkEmailAvailability(newValue);
                      }, 500); // 500ms debounce
                    } else {
                      // Cancel check if field is empty
                      if (emailCheckTimeoutRef.current) {
                        clearTimeout(emailCheckTimeoutRef.current);
                        emailCheckTimeoutRef.current = null;
                      }
                      setIsCheckingEmail(false);
                    }
                  }}
                  onBlur={() => {
                    if (!hasEmail) {
                      setTouchedFields((prev) => ({ ...prev, email: true }));
                      validateField("email", email);
                    }
                  }}
                  disabled={hasEmail}
                  className={
                    hasEmail
                      ? "bg-muted"
                      : fieldErrors.email
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                  }
                  data-testid="input-contact-email"
                />
                {isCheckingEmail && !hasEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {fieldErrors.email && (
                <p className="text-sm font-medium text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium">
                Company
              </Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setCompany(newValue);
                  // Validate in real-time if field has been touched
                  if (touchedFields.company) {
                    validateField("company", newValue);
                  }
                }}
                onBlur={() => {
                  setTouchedFields((prev) => ({ ...prev, company: true }));
                  validateField("company", company);
                }}
                className={
                  fieldErrors.company
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                data-testid="input-contact-company"
              />
              {fieldErrors.company && (
                <p className="text-sm font-medium text-destructive">
                  {fieldErrors.company}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setTitle(newValue);
                  // Validate in real-time if field has been touched
                  if (touchedFields.title) {
                    validateField("title", newValue);
                  }
                }}
                onBlur={() => {
                  setTouchedFields((prev) => ({ ...prev, title: true }));
                  validateField("title", title);
                }}
                className={
                  fieldErrors.title
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
                data-testid="input-contact-title"
              />
              {fieldErrors.title && (
                <p className="text-sm font-medium text-destructive">
                  {fieldErrors.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin" className="text-sm font-medium">
                LinkedIn
                {hasLinkedin && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (cannot be changed)
                  </span>
                )}
              </Label>
              <Input
                id="linkedin"
                value={linkedin}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setLinkedin(newValue);
                  // Validate in real-time if field has been touched
                  if (touchedFields.linkedin) {
                    validateField("linkedin", newValue);
                  }
                }}
                onBlur={() => {
                  if (!hasLinkedin) {
                    setTouchedFields((prev) => ({ ...prev, linkedin: true }));
                    validateField("linkedin", linkedin);
                  }
                }}
                disabled={hasLinkedin}
                className={
                  hasLinkedin
                    ? "bg-muted"
                    : fieldErrors.linkedin
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                }
                data-testid="input-contact-linkedin"
              />
              {fieldErrors.linkedin && (
                <p className="text-sm font-medium text-destructive">
                  {fieldErrors.linkedin}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedValue" className="text-sm font-medium">
                Estimated Value
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="estimatedValue"
                  type="number"
                  min="1"
                  max="999999"
                  step="1"
                  value={estimatedValue}
                  onChange={handleEstimatedValueChange}
                  onKeyDown={(e) => {
                    // Prevent negative sign, 'e', 'E', '+', and decimal point
                    if (
                      e.key === "-" ||
                      e.key === "e" ||
                      e.key === "E" ||
                      e.key === "+" ||
                      e.key === "."
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className={`pl-9 ${validationError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  placeholder="1"
                  data-testid="input-contact-estimated-value"
                />
              </div>
              {validationError && (
                <p className="text-sm font-medium text-destructive">
                  {validationError}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="button-cancel-edit"
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSubmitting ||
              Object.keys(fieldErrors).length > 0 ||
              isCheckingEmail
            }
            data-testid="button-save-edit"
            className={cn(
              "flex-1 bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 sm:flex-none"
            )}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
