import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, UserRoundCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {
  ProfileCompletionStatus,
  ProfileCompletionUpdate,
} from "@/lib/api/profiles";
import { useAuth } from "@/contexts/AuthContext";
import { PayoutCountryField } from "@/components/recruitment/PayoutCountryField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  OrganizationField,
  type OrganizationSelection,
} from "./OrganizationField";

const COUNTRY_REQUIRED_MESSAGE = "Please select your country to continue.";
const GENERIC_SAVE_ERROR = "We couldn't save your details. Please try again.";

/**
 * Nest returns DTO validation failures as an array of messages; surface the
 * first one rather than letting it render comma-joined.
 */
function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const message = (error.data as { message?: string | string[] })?.message;

    if (Array.isArray(message)) {
      return message[0] ?? GENERIC_SAVE_ERROR;
    }

    return message || GENERIC_SAVE_ERROR;
  }

  return GENERIC_SAVE_ERROR;
}

/** Title and subtitle track which steps the modal is actually showing. */
function resolveCopy(needsCountry: boolean, canEditOrganization: boolean) {
  if (needsCountry && canEditOrganization) {
    return {
      title: "Finish setting up your account",
      subtitle:
        "Confirm your country to continue. Adding your organization is optional.",
    };
  }

  if (needsCountry) {
    return {
      title: "Confirm your country",
      subtitle: "Select the country you are based in to continue.",
    };
  }

  return {
    title: "Add your organization",
    subtitle: "Search for your organization, or continue without one.",
  };
}

/**
 * Blocking gate that collects the profile details required before the app can
 * be used. Country is mandatory; organization is prompted once and skipped by
 * confirming with the field left empty.
 *
 * The dialog is deliberately non-dismissible: `DialogContent` already prevents
 * escape-key and outside-click closing, and `hideCloseButton` removes the only
 * remaining exit.
 */
export function ProfileCompletionModal() {
  const { refreshUser } = useAuth();
  const [country, setCountry] = useState("");
  const [organization, setOrganization] = useState<OrganizationSelection>(null);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: status, isPending: isLoadingStatus } =
    useQuery<ProfileCompletionStatus>({
      queryKey: ["profile-completion"],
      queryFn: () => api.profiles.getCompletion(),
      retry: false,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    });

  // Pre-select only when detection landed on a country we actually support.
  // An unsupported or failed lookup deliberately leaves the field empty so the
  // user must choose, rather than silently accepting a wrong payout country.
  useEffect(() => {
    const suggestion = status?.suggestions?.country;
    if (suggestion?.supported && suggestion.detected) {
      setCountry(suggestion.detected);
    }
  }, [status]);

  const needsCountry = !!status?.missingSteps.includes("country");
  const currentOrganization = status?.current?.organization ?? null;
  const canEditOrganization = !!status?.optionalSteps.includes("organization");
  const showOrganization = canEditOrganization || !!currentOrganization;

  const { title, subtitle } = resolveCopy(needsCountry, canEditOrganization);

  const { mutate: submit, isPending: isSaving } = useMutation({
    mutationFn: () => {
      const payload: ProfileCompletionUpdate = {};

      if (needsCountry) {
        payload.country = country;
      }

      if (canEditOrganization) {
        if (organization?.kind === "existing") {
          payload.organizationId = organization.id;
        } else if (organization?.kind === "new") {
          payload.organizationName = organization.name;
        } else {
          payload.skipOrganization = true;
        }
      }

      return api.profiles.updateCompletion(payload);
    },
    onSuccess: async () => {
      // The gate unmounts once the refreshed user satisfies both steps.
      await refreshUser();
    },
    onError: (err: unknown) => {
      setFormError(resolveErrorMessage(err));
    },
  });

  const handleCountryChange = (value: string) => {
    setCountry(value);
    setCountryError(null);
    setFormError(null);
  };

  const handleOrganizationChange = (value: OrganizationSelection) => {
    setOrganization(value);
    setFormError(null);
  };

  /**
   * The CTA stays enabled with no selection on purpose: clicking it tells the
   * user what is missing, whereas a disabled button leaves them guessing.
   */
  const handleSubmit = () => {
    if (needsCountry && !country) {
      setCountryError(COUNTRY_REQUIRED_MESSAGE);
      return;
    }

    submit();
  };

  return (
    <Dialog open>
      <DialogContent
        hideCloseButton
        className="focus:outline-none sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <UserRoundCheck
              className="h-5 w-5 text-muted-foreground"
              aria-hidden
            />
            {title}
          </DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoadingStatus ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            <>
              {needsCountry ? (
                <PayoutCountryField
                  value={country}
                  onChange={handleCountryChange}
                  error={countryError}
                />
              ) : null}

              {showOrganization ? (
                <OrganizationField
                  value={organization}
                  onChange={handleOrganizationChange}
                  current={currentOrganization}
                />
              ) : null}
            </>
          )}

          {formError ? (
            <p className="text-sm font-medium text-destructive">{formError}</p>
          ) : null}

          <Button
            type="button"
            variant="brand"
            className="w-full"
            disabled={isLoadingStatus || isSaving}
            onClick={handleSubmit}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving...
              </>
            ) : (
              "Confirm & Continue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
