import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SignIn = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [isSigningInMicrosoft, setIsSigningInMicrosoft] = useState(false);
  const [errorShown, setErrorShown] = useState(false);
  const isSigningIn = isSigningInGoogle || isSigningInMicrosoft;

  // Candidate apply flows (consent email / public job share) — hide "Welcome Back"
  const hideWelcomeBack =
    Boolean(searchParams.get("consentToken")) ||
    Boolean(searchParams.get("originJobId"));

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error && !errorShown) {
      const title = searchParams.get("error_title") ?? "Sign-in Error";
      toast({
        variant: "destructive",
        title,
        description: error,
        action: (
          <div className="h-8 w-8">
            <AlertCircle className="h-4 w-4" />
          </div>
        ),
      });
      setErrorShown(true);
      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("error");
      newUrl.searchParams.delete("error_title");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [searchParams, errorShown]);

  // Builds the OAuth init URL, forwarding any params that must survive the
  // OAuth round-trip:
  //   - returnTo (post-auth navigation, e.g. claim flow)
  //   - originJobId / originRef (public job page → signup gating)
  //   - originRequestId / originRef (public request page → signup gating)
  //   - connectorSignup=true (set only by "I Have a Candidate" — drives
  //     whether the server writes a marketplace-split origin row)
  //   - consentToken (public consent page → signup gating via JWT verify)
  const buildOAuthUrl = (basePath: "google" | "microsoft") => {
    const baseUrl = import.meta.env.VITE_API_URL || "/api";
    const url = `${baseUrl.replace(/\/$/, "")}/auth/${basePath}`;

    const searchParams = new URLSearchParams(window.location.search);
    const outbound = new URLSearchParams();

    const returnTo = searchParams.get("returnTo");
    if (returnTo) outbound.set("returnTo", returnTo);

    const originJobId = searchParams.get("originJobId");
    if (originJobId) outbound.set("originJobId", originJobId);

    const originRequestId = searchParams.get("originRequestId");
    if (originRequestId) outbound.set("originRequestId", originRequestId);

    const originRef = searchParams.get("originRef");
    if (originRef) outbound.set("originRef", originRef);

    const connectorSignup = searchParams.get("connectorSignup");
    if (connectorSignup) outbound.set("connectorSignup", connectorSignup);

    const consentToken = searchParams.get("consentToken");
    if (consentToken) outbound.set("consentToken", consentToken);

    const query = outbound.toString();
    return query ? `${url}?${query}` : url;
  };

  const handleGoogleSignIn = () => {
    setIsSigningInGoogle(true);
    window.location.href = buildOAuthUrl("google");
  };

  const handleMicrosoftSignIn = () => {
    setIsSigningInMicrosoft(true);
    window.location.href = buildOAuthUrl("microsoft");
  };

  // Show loading state while checking auth status to prevent login form flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/30">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo Section */}
        <div className="flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center transition-opacity hover:opacity-80"
          >
            <img src="/prospectly-logo.png" alt="Prospectly" className="h-11" />
            <span className="ml-1 text-xs text-muted-foreground">™</span>
          </Link>
        </div>

        {/* Sign In Card */}
        <Card className="relative overflow-hidden bg-transparent border-0 shadow-none md:bg-gradient-to-br md:from-card md:via-card md:to-primary/3 md:border md:border-border/80 md:shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-all duration-300">
          {/* Subtle gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-purple-600/50 to-primary/50 hidden md:block"></div>

          {/* Subtle background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/2 via-transparent to-purple-600/2 opacity-50 pointer-events-none hidden md:block"></div>

          <CardHeader className="relative z-10 text-center space-y-3 pb-6 pt-8 px-0 md:px-6">
            {!hideWelcomeBack && (
              <CardTitle className="text-3xl md:text-2xl font-bold md:font-semibold text-foreground">
                Welcome Back
              </CardTitle>
            )}
            <CardDescription className="text-lg md:text-base text-muted-foreground">
              Sign in to access your account
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10 space-y-8 md:space-y-6 pb-8 px-0 md:px-6">
            <div className="flex flex-col gap-4 md:gap-6 w-full max-w-[320px] md:max-w-full mx-auto">
              {/* Google Sign In Button */}
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-normal text-base border-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                size="lg"
              >
                {isSigningInGoogle ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-3"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
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
                    <span>Continue with Google</span>
                  </>
                )}
              </Button>

              {/* Microsoft Sign In Button */}
              <Button
                type="button"
                onClick={handleMicrosoftSignIn}
                disabled={isSigningIn}
                className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-normal text-base border-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                size="lg"
              >
                {isSigningInMicrosoft ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
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
                    <span>Continue with Microsoft</span>
                  </div>
                )}
              </Button>
            </div>

            {/* Security Note */}
            <div className="pt-4 border-t border-border/60 px-4 md:px-0">
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
                  className="text-foreground hover:text-primary underline underline-offset-2 transition-colors font-medium whitespace-nowrap"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-foreground hover:text-primary underline underline-offset-2 transition-colors font-medium whitespace-nowrap"
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
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
