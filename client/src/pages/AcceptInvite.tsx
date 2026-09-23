import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Shield,
  Link2Off,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { utcDayjs } from "@/lib/dayjs";

type InviteDetails = Awaited<ReturnType<typeof api.invites.getByToken>>;

type AcceptInviteView =
  | "loading"
  | "success"
  | "blocked"
  | "email_mismatch"
  | "main";

function AcceptInviteLogoLink() {
  return (
    <div className="flex justify-center">
      <Link
        to="/"
        className="inline-flex items-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
      >
        <img src="/prospectly-logo.png" alt="Prospectly" className="h-11" />
        <span className="ml-1 text-xs text-muted-foreground">™</span>
      </Link>
    </div>
  );
}

function AcceptInviteFooterLink() {
  return (
    <div className="text-center">
      <Link
        to="/"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
      >
        <span>←</span>
        <span>Back to Home</span>
      </Link>
    </div>
  );
}

function AcceptInvitePageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/30 flex items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <AcceptInviteLogoLink />
        {children}
        <AcceptInviteFooterLink />
      </div>
    </div>
  );
}

function getInviteRestrictionFlags({
  invite,
  linkExpired,
  linkCancelled,
  alreadyAccepted,
}: {
  invite: InviteDetails | undefined;
  linkExpired: boolean;
  linkCancelled: boolean;
  alreadyAccepted: boolean;
}) {
  const isAccepted = invite?.status === "ACCEPTED" || alreadyAccepted;
  const isCancelled = invite?.status === "CANCELLED" || linkCancelled;
  const isExpired =
    !isCancelled &&
    (invite?.status === "EXPIRED" ||
      linkExpired ||
      Boolean(
        invite?.expiresAt && utcDayjs().isAfter(utcDayjs(invite.expiresAt))
      ));
  return { isExpired, isAccepted, isCancelled };
}

function resolveAcceptInviteView({
  inviteLoading,
  authLoading,
  inviteAccepted,
  inviteError,
  error,
  isExpired,
  isAccepted,
  isCancelled,
  emailMismatch,
}: {
  inviteLoading: boolean;
  authLoading: boolean;
  inviteAccepted: boolean;
  inviteError: unknown;
  error: string | null;
  isExpired: boolean;
  isAccepted: boolean;
  isCancelled: boolean;
  emailMismatch: boolean;
}): AcceptInviteView {
  if (inviteLoading || authLoading) return "loading";
  if (inviteAccepted) return "success";
  if (inviteError || error || isExpired || isAccepted || isCancelled) {
    return "blocked";
  }
  if (emailMismatch) return "email_mismatch";
  return "main";
}

function getAcceptInviteBlockedCopy({
  isAccepted,
  isExpired,
  isCancelled,
  error,
}: {
  isAccepted: boolean;
  isExpired: boolean;
  isCancelled: boolean;
  error: string | null;
}) {
  if (isAccepted) {
    return {
      title: "Already Accepted!",
      message: "This invitation has already been accepted.",
    };
  }
  if (isCancelled) {
    return {
      title: "Invitation Cancelled",
      message: "This invitation has been cancelled and is no longer available.",
    };
  }
  if (isExpired) {
    return {
      title: "Link Expired!",
      message: "This invitation link has expired and can no longer be used.",
    };
  }
  if (error) {
    return {
      title: "Access Denied!",
      message: decodeURIComponent(error),
    };
  }
  return {
    title: "Access Denied!",
    message: "You have no permission to visit this page",
  };
}

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [emailMismatch, setEmailMismatch] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const [linkCancelled, setLinkCancelled] = useState(false);

  // Check for success/error from OAuth callback
  const inviteAccepted = searchParams.get("invite_accepted") === "true";
  const subscriptionCreated =
    searchParams.get("subscription_created") === "true";
  const error = searchParams.get("error");

  // Fetch invite details
  const {
    data: invite,
    isLoading: inviteLoading,
    error: inviteError,
  } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => api.invites.getByToken(token!),
    enabled: !!token && !inviteAccepted,
  });

  // Validate invite with email
  const validateMutation = useMutation({
    mutationFn: (email: string) => api.invites.validate(token!, email),
    onSuccess: (data) => {
      if (!data.eligible) {
        if (data.reason === "EMAIL_MISMATCH") {
          navigate("/dashboard");
        } else if (
          data.reason === "DUPLICATE_ACCEPTANCE" ||
          data.reason === "ALREADY_ACCEPTED"
        ) {
          setAlreadyAccepted(true);
        } else if (data.reason === "INVITE_CANCELLED") {
          setLinkCancelled(true);
        } else if (
          data.reason === "INVITE_EXPIRED" ||
          data.reason === "INVITE_NOT_FOUND"
        ) {
          setLinkExpired(true);
        }
      }
    },
  });

  // Accept invite mutation (backend re-validates email; surface errors in UI)
  const acceptMutation = useMutation({
    mutationFn: () => api.invites.accept(token!),
    onSuccess: () => {
      navigate("/dashboard?invite_accepted=true&subscription_created=true");
    },
    onError: (err: unknown) => {
      const msg = String(
        (err as { message?: string; data?: { message?: string } })?.data
          ?.message ??
          (err as Error)?.message ??
          ""
      ).toLowerCase();
      if (msg.includes("email") && msg.includes("match"))
        navigate("/dashboard");
      else if (msg.includes("already accepted")) setAlreadyAccepted(true);
      else if (msg.includes("cancelled")) setLinkCancelled(true);
      else if (msg.includes("expired") || msg.includes("not eligible"))
        setLinkExpired(true);
    },
  });

  // Create portal session mutation
  const portalMutation = useMutation({
    mutationFn: () =>
      api.subscriptions.createPortalSession(
        `${window.location.origin}/dashboard?subscription_updated=true`
      ),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  // Handle Google OAuth with invite token
  const handleGoogleSignIn = () => {
    const baseUrl = import.meta.env.VITE_API_URL || "/api";
    const url = baseUrl.endsWith("/auth/google")
      ? baseUrl
      : `${baseUrl.replace(/\/$/, "")}/auth/google`;
    // Add invite token as query parameter - backend will extract it from callback
    window.location.href = `${url}?invite_token=${encodeURIComponent(token || "")}`;
  };

  const handleMicrosoftSignIn = () => {
    const baseUrl = import.meta.env.VITE_API_URL || "/api";
    const url = baseUrl.endsWith("/auth/microsoft")
      ? baseUrl
      : `${baseUrl.replace(/\/$/, "")}/auth/microsoft`;
    // Add invite token as query parameter - backend will extract it from callback
    window.location.href = `${url}?invite_token=${encodeURIComponent(token || "")}`;
  };

  const hasValidated = useRef(false);

  // When OAuth redirects with wrong email (error param or email_mismatch param), show mismatch immediately
  useEffect(() => {
    if (
      searchParams.get("email_mismatch") === "true" ||
      (error &&
        invite &&
        (error.includes("match") ||
          error.includes("email") ||
          error.includes("Email")))
    ) {
      navigate("/dashboard");
    }
  }, [searchParams, error, invite, navigate]);

  // Reset validation and invite restriction flags when token or user changes
  // so state from one invite cannot leak into the next (component stays mounted).
  // Must run before the validation effect below.
  useEffect(() => {
    hasValidated.current = false;
    setLinkCancelled(false);
    setAlreadyAccepted(false);
    setLinkExpired(false);
  }, [token, user?.email]);

  // Handle email validation on OAuth callback (user logged in → validate email vs invite)
  useEffect(() => {
    if (user && invite && !inviteAccepted && !hasValidated.current) {
      hasValidated.current = true;
      validateMutation.mutate(user.email);
    }
  }, [user, invite, inviteAccepted, validateMutation]);

  const { isExpired, isAccepted, isCancelled } = getInviteRestrictionFlags({
    invite,
    linkExpired,
    linkCancelled,
    alreadyAccepted,
  });

  const view = resolveAcceptInviteView({
    inviteLoading,
    authLoading,
    inviteAccepted,
    inviteError,
    error,
    isExpired,
    isAccepted,
    isCancelled,
    emailMismatch,
  });

  if (view === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (view === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/30 flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
          {/* Logo Section */}
          <div className="flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            >
              <img
                src="/prospectly-logo.png"
                alt="Prospectly"
                className="h-11"
              />
              <span className="ml-1 text-xs text-muted-foreground">™</span>
            </Link>
          </div>

          <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/3 border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300">
            {/* Subtle gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-purple-600/50 to-primary/50"></div>

            <CardHeader className="relative z-10 text-center space-y-3 pb-6 pt-8">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Welcome to Prospectly!
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Your invite has been accepted successfully
              </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10 space-y-6 pb-8">
              {subscriptionCreated && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3 text-left">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">
                    Your subscription has been activated. You now have access to{" "}
                    <strong>
                      {invite?.subscriptionPlan?.name || "the plan"}
                    </strong>
                    .
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-semibold text-base border-0"
                >
                  Go to Dashboard
                </Button>
                {user && (
                  <Button
                    onClick={() => portalMutation.mutate()}
                    variant="outline"
                    className="w-full h-12 border-border/60 hover:bg-muted/50 transition-all duration-200"
                    disabled={portalMutation.isPending}
                  >
                    {portalMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Manage Subscription
                        <ExternalLink className="ml-2 h-4 w-4 opacity-70" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Footer Link */}
          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              <span>←</span>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (view === "blocked") {
    const { title, message } = getAcceptInviteBlockedCopy({
      isAccepted,
      isExpired,
      isCancelled,
      error,
    });

    return (
      <AcceptInvitePageShell>
        <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/3 border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-purple-600/50 to-primary/50" />

          <CardHeader className="relative z-10 text-center space-y-3 pb-6 pt-8 px-6">
            <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              {isAccepted ? (
                <CheckCircle className="h-10 w-10 text-muted-foreground" />
              ) : (
                <Link2Off className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">
              {title}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground leading-relaxed px-2">
              {message}
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10 space-y-4 pb-8 px-6">
            <Button
              onClick={() => navigate("/")}
              className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-semibold text-base border-0"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </AcceptInvitePageShell>
    );
  }

  if (view === "email_mismatch") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/30 flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
          {/* Logo Section */}
          <div className="flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            >
              <img
                src="/prospectly-logo.png"
                alt="Prospectly"
                className="h-11"
              />
              <span className="ml-1 text-xs text-muted-foreground">™</span>
            </Link>
          </div>

          <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/3 border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/50 via-destructive/50 to-red-500/50"></div>

            <CardHeader className="relative z-10 text-center space-y-3 pb-6 pt-8">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Email Mismatch
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground leading-relaxed px-4">
                The email address you're using doesn't match the invite
              </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10 space-y-6 pb-8">
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-left space-y-2">
                <p className="text-sm text-foreground">
                  This invite was sent to <strong>{invite?.email}</strong>
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-muted-foreground text-left px-1">
                  <p className="font-semibold mb-1 text-foreground">
                    To accept this invite, please:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-1 opacity-80">
                    <li>Sign out and sign in with {invite?.email}</li>
                    <li>Or contact the person who sent you this invite</li>
                  </ul>
                </div>
                <Button
                  onClick={() => navigate("/signin")}
                  className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-semibold text-base border-0"
                >
                  Sign Out & Try Again
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer Link */}
          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              <span>←</span>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/30 flex items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Logo Section */}
        <div className="flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
          >
            <img src="/prospectly-logo.png" alt="Prospectly" className="h-11" />
            <span className="ml-1 text-xs text-muted-foreground">™</span>
          </Link>
        </div>

        <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/3 border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300">
          {/* Subtle gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-purple-600/50 to-primary/50"></div>

          <CardHeader className="relative z-10 text-center space-y-3 pb-6 pt-8">
            <CardTitle className="text-2xl font-bold text-foreground">
              You're Invited!
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground leading-relaxed">
              Join Prospectly with a special subscription offer
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10 space-y-6 pb-8">
            {invite && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border/40 space-y-3 text-left">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">
                    Invited Email:
                  </span>
                  <span className="text-foreground font-semibold">
                    {invite.email}
                  </span>
                </div>
                {invite.organisationName ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">
                      Organization:
                    </span>
                    <span className="text-foreground font-semibold text-right max-w-[60%]">
                      {invite.organisationName}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">
                    Plan:
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {invite.subscriptionPlan?.name || "Premium"}
                  </Badge>
                </div>
                {invite.subscriptionPlan?.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
                    {invite.subscriptionPlan.description}
                  </p>
                )}
              </div>
            )}

            {user ? (
              <div className="space-y-4">
                {validateMutation.isPending ? (
                  <Loader
                    message="Checking your email against the invite…"
                    size="sm"
                  />
                ) : validateMutation.isSuccess ? (
                  <>
                    <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-sm text-indigo-800 dark:text-indigo-200 text-left">
                      You're signed in as <strong>{user.email}</strong>. Click
                      below to accept this invite.
                    </div>
                    <Button
                      onClick={() => acceptMutation.mutate()}
                      className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-semibold text-base border-0"
                      disabled={acceptMutation.isPending}
                    >
                      {acceptMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        "Accept Invite"
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground text-left">
                      Signed in as <strong>{user.email}</strong>. If this
                      matches the invite email, you can accept below.
                    </p>
                    <Button
                      onClick={() => acceptMutation.mutate()}
                      className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-semibold text-base border-0"
                      disabled={acceptMutation.isPending}
                    >
                      {acceptMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        "Accept Invite"
                      )}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-sm text-center text-muted-foreground leading-relaxed">
                  Sign in with either Google or Microsoft to accept this invite.
                  Make sure to use: <strong>{invite?.email}</strong>
                </p>
                <Button
                  onClick={handleGoogleSignIn}
                  className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-semibold text-base border-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                  variant="outline"
                >
                  <svg
                    className="h-5 w-5 mr-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  onClick={handleMicrosoftSignIn}
                  className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-semibold text-base border-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                  variant="outline"
                >
                  <div className="flex items-center pl-[10px]">
                    <svg
                      className="w-5 h-5 mr-3"
                      viewBox="0 0 23 23"
                      fill="none"
                    >
                      <path d="M11 0H0V11H11V0Z" fill="#F25022" />
                      <path d="M23 0H12V11H23V0Z" fill="#7FBA00" />
                      <path d="M11 12H0V23H11V12Z" fill="#00A4EF" />
                      <path d="M23 12H12V23H23V12Z" fill="#FFB900" />
                    </svg>
                    Continue with Microsoft
                  </div>
                </Button>
              </div>
            )}

            {/* Security Note */}
            <div className="pt-4 border-t border-border/60 px-4 md:px-0 text-left">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-indigo-600 dark:text-indigo-500" />
                <p className="leading-relaxed">
                  Your data is protected with enterprise-grade security and
                  encryption
                </p>
              </div>
            </div>

            {/* Terms and Privacy */}
            <div className="pt-2 px-6 md:px-0">
              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                By continuing, you agree to our{" "}
                <Link
                  to="/terms"
                  className="text-foreground hover:text-primary underline underline-offset-2 transition-colors font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-foreground hover:text-primary underline underline-offset-2 transition-colors font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Link */}
        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <span>←</span>
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
