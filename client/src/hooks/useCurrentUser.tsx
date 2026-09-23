import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

// User data comes from AuthContext which fetches from Express API (/api/auth/me)
// No need for additional Supabase calls - just transform the data we already have

interface CurrentUserProfile {
  id: number;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  company?: string;
}

export function useCurrentUser() {
  const { user, loading } = useAuth();

  // Transform auth user data to profile format
  const profile = useMemo<CurrentUserProfile | null>(() => {
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      // Note: first_name, last_name, and company not available in current Express API user object
      // These would need to be added to the Express /api/auth/me endpoint if needed
    };
  }, [user]);

  return {
    currentUser: profile,
    loading,
    isCurrentUser: (userId: number | string) => profile?.id === Number(userId),
  };
}
