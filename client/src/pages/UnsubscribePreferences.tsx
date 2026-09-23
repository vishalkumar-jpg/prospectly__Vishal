import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Mail } from "lucide-react";
import SEO from "@/components/SEO";
import { EmailPreferencesForm } from "@/components/profile/EmailPreferencesSection";
import {
  useNotificationPreferencesPublic,
  useSaveNotificationPreferencesPublic,
} from "@/hooks/useNotificationPreferences";
import { Button } from "@/components/ui/button";

export default function UnsubscribePreferences() {
  const [searchParams] = useSearchParams();
  const [saved, setSaved] = useState(false);

  const tokenParams = useMemo(
    () => ({
      u: searchParams.get("u") ?? undefined,
      e: searchParams.get("e") ?? undefined,
      sig: searchParams.get("sig") ?? undefined,
    }),
    [searchParams]
  );

  const { data, isLoading, isError, refetch } =
    useNotificationPreferencesPublic(tokenParams);
  const saveMutation = useSaveNotificationPreferencesPublic();

  if (!tokenParams.sig || (!tokenParams.u && !tokenParams.e)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold">Invalid link</h1>
        <p className="mt-2 text-muted-foreground">
          This unsubscribe link is missing required parameters.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Go to Prospectly</Link>
        </Button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold">Link expired or invalid</h1>
        <p className="mt-2 text-muted-foreground">
          We could not verify this unsubscribe link. Use a recent email footer
          link or sign in to manage preferences.
        </p>
        <Button asChild className="mt-6">
          <Link to="/signin">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Email Preferences"
        description="Manage your Prospectly email notification preferences"
      />
      <div className="min-h-screen bg-gradient-to-b from-brand-amethyst/[0.06] to-background px-4 py-10">
        <div className="mx-auto max-w-[900px]">
          <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-col items-center px-6 pb-0 pt-8 text-center">
              <Link to="/" className="mb-6">
                <img
                  src="/prospectly-logo.png"
                  alt="Prospectly"
                  className="h-11 w-auto max-w-[254px]"
                />
              </Link>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-amethyst/20 bg-brand-amethyst/10 px-2.5 py-1 text-xs font-semibold text-brand-amethyst">
                <Mail className="h-3.5 w-3.5" />
                Email preferences
              </span>
              <h1 className="mb-2 text-2xl font-extrabold leading-tight">
                Manage your email notifications
              </h1>
              <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
                Choose which emails you want to receive.
              </p>
            </div>

            {saved ? (
              <div className="px-6 py-10 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-brand-success" />
                <h2 className="mb-2 text-xl font-bold">Preferences updated</h2>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Your email preferences have been saved. You can change them
                  anytime from your profile or any future email link.
                </p>
              </div>
            ) : (
              <div className="px-6 pb-6 pt-5">
                <EmailPreferencesForm
                  variant="public"
                  unsubscribeAll={data?.unsubscribeAll ?? false}
                  categories={data?.categories ?? []}
                  isLoading={isLoading}
                  isSaving={saveMutation.isPending}
                  onSave={async (body) => {
                    await saveMutation.mutateAsync({
                      ...body,
                      ...tokenParams,
                      sig: tokenParams.sig!,
                    });
                    await refetch();
                    setSaved(true);
                  }}
                />
              </div>
            )}
          </article>

          {data?.isRegistered ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Have an account?{" "}
              <Link
                to="/profile/email-preferences"
                className="font-semibold text-brand-rose hover:underline"
              >
                Manage preferences in your profile
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
