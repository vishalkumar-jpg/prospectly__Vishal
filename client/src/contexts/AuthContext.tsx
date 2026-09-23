import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { api, setTokenExpiration, clearTokenExpiration } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { logRocketService } from "@/lib/logrocket";
import { analytics } from "@/lib/analytics";

interface UserConfiguration {
  hasSeenWelcomePopup: boolean;
  hasSkipBankAccount?: boolean;
  hasSkippedOrganisation?: boolean;
  hasImportedContacts?: boolean;
  preferredWorkspace?: "recruiting" | "prospecting" | "both" | null;
  primaryWorkspace?: "recruiting" | "prospecting" | null;
  googleImportTab: "automatic" | "manual";
  microsoftImportTab: "automatic" | "manual";
  appleImportTab: "intro" | "automatic" | "manual" | "automatic-credentials";
  linkedinImportTab: "instructions" | "upload_zip";
  accountDeletionRequestedAt?: string | null;
  accountDeletionScheduledAt?: string | null;
}

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  company?: string;
  profilePhotoUrl?: string | null;
  userConfiguration?: UserConfiguration;
  linkedinUrl?: string | null;
  /** ISO 3166-1 alpha-2 payout country (US, IN, PH, MX, ZA). */
  country?: string | null;
  /** True when the user has any non-deleted organisation membership. */
  hasOrganisation?: boolean;
  // Modules the user's organisation(s) have been granted (e.g. "recruiting").
  // Prospecting is always available and is not represented here.
  accessibleModules?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserConfiguration: (
    config: Partial<UserConfiguration> & Record<string, unknown>
  ) => void;
  photoVersion: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  ssrMode = false,
}: {
  children: React.ReactNode;
  ssrMode?: boolean;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!ssrMode);
  const [photoVersion, setPhotoVersion] = useState(0);
  const loginTrackedRef = useRef(false);
  const previousUserRef = useRef<User | null>(null);

  // Fetch current user from cookie-based session
  const refreshUser = async () => {
    try {
      // Session probe: relies on the standard auto-refresh path so a valid
      // 30-day refresh cookie silently renews the access token on cold load.
      // redirectToLogin() is already guarded by isPublicAppRoute(), so guests
      // on public/marketing pages are never bounced to /signin.
      const response = await api.auth.me();
      const hadUserBefore = !!previousUserRef.current; // Track if user existed before this refresh
      previousUserRef.current = response; // Update ref before state update
      setUser(response);
      // Increment photo version to trigger cache busting in components watching for photo changes
      setPhotoVersion((prev) => prev + 1);
      // Set token expiration after successful authentication
      if (response) {
        setTokenExpiration();

        // Identify user in LogRocket for session tracking
        logRocketService.identify(response.id, {
          email: response.email,
          name: response.fullName,
          role: response.role,
        });

        // Track login success immediately after identification
        // This fires when:
        // 1. User didn't exist before (fresh login)
        // 2. We're on auth callback route (OAuth flow)
        // 3. Haven't tracked this session yet
        const isAuthCallback = window.location.pathname === "/auth/callback";
        if ((!hadUserBefore || isAuthCallback) && !loginTrackedRef.current) {
          loginTrackedRef.current = true;
          const inviteId =
            new URLSearchParams(window.location.search).get("invite_token") ||
            "";
          analytics.trackBetaLoginSuccess({
            method: "oauth",
            inviteId,
            accountId: String(response.id),
          });
        }
      } else {
        // Reset tracking flag when user logs out
        loginTrackedRef.current = false;
        previousUserRef.current = null;
      }
    } catch {
      setUser(null);
      loginTrackedRef.current = false;
      previousUserRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ssrMode) return;
    refreshUser();
  }, [ssrMode]);

  const logout = async () => {
    // Track logout event before clearing user data
    logRocketService.track("User Logout");

    await api.auth.logout();
    clearTokenExpiration();
    queryClient.clear();
    setUser(null);
    // Reset login tracking flag for next session
    loginTrackedRef.current = false;
    previousUserRef.current = null;
  };

  const updateUserConfiguration = (
    config: Partial<UserConfiguration> & Record<string, unknown>
  ) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        userConfiguration: {
          ...(prev.userConfiguration ?? {}),
          ...config,
        } as UserConfiguration,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        refreshUser,
        updateUserConfiguration,
        photoVersion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
