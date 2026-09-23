import { useState, useEffect } from "react";

import { AnyType } from "@/types/common";
import { toUTC } from "@/lib/dayjs";

// TODO: Implement Express API endpoints for trust badges functionality
// Required endpoints:
// - GET /api/trust-badges - Fetch all trust badges
// - POST /api/trust-badges - Create new badge (admin only)
// - PATCH /api/trust-badges/:id - Update badge (admin only)
// - DELETE /api/trust-badges/:id - Delete badge (admin only)
// - GET /api/trust-badges/status-levels - Fetch trust status levels
// - GET /api/trust-badges/user/:userId - Fetch user's earned badges
// - POST /api/trust-badges/award - Award badge to user
// - DELETE /api/trust-badges/revoke/:userBadgeId - Revoke user badge

export interface TrustBadge {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  image_url?: string;
  point_value: number;
  is_active: boolean;
  auto_awarded: boolean;
  required_value?: number;
  badge_criteria?: AnyType;
  created_at: string;
  updated_at: string;
}

export interface TrustStatusLevel {
  id: string;
  name: string;
  display_name: string;
  min_score: number;
  max_score: number;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  benefits?: TrustStatusBenefit[];
}

export interface TrustStatusBenefit {
  id: string;
  status_level_id: string;
  benefit_type: string;
  benefit_description: string;
  is_active: boolean;
  created_at: string;
}

export interface UserTrustBadge {
  id: string;
  user_id: string;
  badge_id: string;
  awarded_at: string;
  awarded_by?: string;
  is_manual: boolean;
  expires_at?: string;
  points_earned: number;
  award_source: string;
  activity_metadata?: AnyType;
  badge: TrustBadge;
}

export function useTrustBadges() {
  const [badges, setBadges] = useState<TrustBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = async () => {
    try {
      // TODO: Replace with Express API call
      // const response = await request('/api/trust-badges')
      // setBadges(response)

      // Temporary: Return default badge data with sensible point values
      const defaultBadges: TrustBadge[] = [
        {
          id: "1",
          name: "Email Verified",
          description: "Verified email address",
          category: "verification",
          icon: "email",
          color: "blue",
          point_value: 5,
          is_active: true,
          auto_awarded: true,
          created_at: toUTC().toISOString(),
          updated_at: toUTC().toISOString(),
        },
        {
          id: "2",
          name: "Google Contacts Uploaded",
          description: "Imported Google contacts",
          category: "engagement",
          icon: "google",
          color: "green",
          point_value: 10,
          is_active: true,
          auto_awarded: true,
          created_at: toUTC().toISOString(),
          updated_at: toUTC().toISOString(),
        },
        {
          id: "3",
          name: "Microsoft Contacts Uploaded",
          description: "Imported Microsoft contacts",
          category: "engagement",
          icon: "microsoft",
          color: "blue",
          point_value: 10,
          is_active: true,
          auto_awarded: true,
          created_at: toUTC().toISOString(),
          updated_at: toUTC().toISOString(),
        },
        {
          id: "4",
          name: "Apple Contacts Uploaded",
          description: "Imported Apple contacts",
          category: "engagement",
          icon: "apple",
          color: "gray",
          point_value: 10,
          is_active: true,
          auto_awarded: true,
          created_at: toUTC().toISOString(),
          updated_at: toUTC().toISOString(),
        },
        {
          id: "5",
          name: "Quick Responder",
          description: "Responds to requests quickly",
          category: "performance",
          icon: "clock",
          color: "yellow",
          point_value: 15,
          is_active: true,
          auto_awarded: true,
          created_at: toUTC().toISOString(),
          updated_at: toUTC().toISOString(),
        },
        {
          id: "6",
          name: "Quality Introductions",
          description: "Provides high-quality introductions",
          category: "quality",
          icon: "heart",
          color: "red",
          point_value: 20,
          is_active: true,
          auto_awarded: true,
          created_at: toUTC().toISOString(),
          updated_at: toUTC().toISOString(),
        },
        {
          id: "7",
          name: "Community Contributor",
          description: "Active community member",
          category: "engagement",
          icon: "users",
          color: "purple",
          point_value: 15,
          is_active: true,
          auto_awarded: true,
          created_at: toUTC().toISOString(),
          updated_at: toUTC().toISOString(),
        },
        {
          id: "8",
          name: "5+ Positive Reviews",
          description: "Received 5 or more positive reviews",
          category: "quality",
          icon: "award",
          color: "gold",
          point_value: 25,
          is_active: true,
          auto_awarded: true,
          required_value: 5,
          created_at: toUTC().toISOString(),
          updated_at: toUTC().toISOString(),
        },
      ];
      setBadges(defaultBadges);
    } catch {
      // Silently ignored
    } finally {
      setLoading(false);
    }
  };

  const createBadge = async (
    badgeData: Omit<TrustBadge, "id" | "created_at" | "updated_at">
  ) => {
    // TODO: Replace with Express API call
    // await request('/api/trust-badges', { method: 'POST', body: badgeData })
    throw new Error("Feature temporarily unavailable");
  };

  const updateBadge = async (id: string, updates: Partial<TrustBadge>) => {
    // TODO: Replace with Express API call
    // await request(`/api/trust-badges/${id}`, { method: 'PATCH', body: updates })
    throw new Error("Feature temporarily unavailable");
  };

  const deleteBadge = async (id: string) => {
    // TODO: Replace with Express API call
    // await request(`/api/trust-badges/${id}`, { method: 'DELETE' })
    throw new Error("Feature temporarily unavailable");
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  return {
    badges,
    loading,
    createBadge,
    updateBadge,
    deleteBadge,
    refetch: fetchBadges,
  };
}

export function useTrustStatusLevels() {
  const [statusLevels, setStatusLevels] = useState<TrustStatusLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatusLevels = async () => {
    try {
      // TODO: Replace with Express API call
      // const response = await request('/api/trust-badges/status-levels')
      // setStatusLevels(response)

      // Temporary: Return empty array to prevent UI breaking
      setStatusLevels([]);
    } catch {
      // Silently ignored
    } finally {
      setLoading(false);
    }
  };

  const updateStatusLevel = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updates: Partial<TrustStatusLevel>
  ) => {
    // TODO: Replace with Express API call
    // await request(`/api/trust-badges/status-levels/${id}`, { method: 'PATCH', body: updates })
    throw new Error("Feature temporarily unavailable");
  };

  useEffect(() => {
    fetchStatusLevels();
  }, []);

  return {
    statusLevels,
    loading,
    updateStatusLevel,
    refetch: fetchStatusLevels,
  };
}

export function useUserTrustBadges(userId?: string | number) {
  const [userBadges, setUserBadges] = useState<UserTrustBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserBadges = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // TODO: Replace with Express API call
      // const response = await request(`/api/trust-badges/user/${userId}`)
      // setUserBadges(response)

      // Temporary: Return empty array to prevent UI breaking
      setUserBadges([]);
    } catch {
      // Silently ignored
    } finally {
      setLoading(false);
    }
  };

  const awardBadge = async (
    userId: string,
    badgeId: string,
    isManual: boolean = true,
    metadata?: AnyType
  ) => {
    // TODO: Replace with Express API call
    // await request('/api/trust-badges/award', {
    //   method: 'POST',
    //   body: { userId, badgeId, isManual, metadata }
    // })
    throw new Error("Feature temporarily unavailable");
  };

  const revokeBadge = async (userBadgeId: string) => {
    // TODO: Replace with Express API call
    // await request(`/api/trust-badges/revoke/${userBadgeId}`, { method: 'DELETE' })
    throw new Error("Feature temporarily unavailable");
  };

  useEffect(() => {
    fetchUserBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    userBadges,
    loading,
    awardBadge,
    revokeBadge,
    refetch: fetchUserBadges,
  };
}
