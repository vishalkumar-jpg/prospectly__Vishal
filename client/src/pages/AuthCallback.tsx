import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const AuthCallback = () => {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authStatus, setAuthStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/dashboard");

  // Get returnTo from URL params - this preserves claim params
  const returnTo = useMemo(() => {
    const returnToParam = searchParams.get("returnTo");
    if (returnToParam) {
      // Decode and return the full path with params
      return decodeURIComponent(returnToParam);
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    // Refresh user data when component mounts (after OAuth callback)
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    // Set a timeout to prevent infinite waiting
    const timeout = setTimeout(() => {
      setTimeoutReached(true);
      if (!user && !loading) {
        setAuthStatus("error");
      }
    }, 10000); // 10 second timeout

    // Clear timeout if we get a result
    if (user || (!loading && !user)) {
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [user, loading]);

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User authenticated successfully
        // Note: Login success tracking is handled in AuthContext.refreshUser()
        // to ensure it fires immediately after login succeeds
        setAuthStatus("success");

        // Determine redirect path - use returnTo if available (includes claim params)
        const targetPath = returnTo || "/dashboard";
        setRedirectPath(targetPath);

        // Small delay to show success state, then redirect
        setTimeout(() => {
          navigate(targetPath, { replace: true });
        }, 1000);
      } else if (timeoutReached || !user) {
        // No user after loading complete or timeout
        setAuthStatus("error");
        setTimeout(() => {
          navigate("/signin", { replace: true });
        }, 2000);
      }
    }
  }, [user, loading, timeoutReached, navigate, returnTo]);

  const getStatusContent = () => {
    switch (authStatus) {
      case "loading":
        return {
          icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
          title: "Completing sign in...",
          description: "Please wait while we finish setting up your session.",
        };
      case "success":
        return {
          icon: <CheckCircle className="h-8 w-8 text-green-500" />,
          title: "Sign in successful!",
          description: redirectPath.includes("/verify-connection")
            ? "Redirecting you to complete your claim verification..."
            : "Redirecting you to your dashboard...",
        };
      case "error":
        return {
          icon: <XCircle className="h-8 w-8 text-red-500" />,
          title: "Sign in failed",
          description:
            "There was an issue completing your sign in. Redirecting back to sign in page...",
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-hero border border-primary/10">
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">{content.icon}</div>
            <div>
              <h2 className="text-xl font-semibold">{content.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {content.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
