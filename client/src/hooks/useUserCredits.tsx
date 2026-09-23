import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { toUTC } from "@/lib/dayjs";

export interface UserCredits {
  id: string;
  user_id: number; // Fixed: Express API uses number for user ID
  credits_available: number;
  credits_used: number;
  credits_earned: number;
  plan_type?: string;
  last_earned_at?: string;
  created_at: string;
  updated_at: string;
}

export function useUserCredits() {
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCredits = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Mock implementation since user_credits table doesn't exist
      const mockCredits: UserCredits = {
        id: crypto.randomUUID(),
        user_id: user.id,
        credits_available: 1000,
        credits_used: 0,
        credits_earned: 0,
        plan_type: "free", // Add default plan type
        created_at: toUTC().toISOString(),
        updated_at: toUTC().toISOString(),
      };

      setUserCredits(mockCredits);
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch credits information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const useCredits = async (amount: number, description?: string) => {
    if (!user || !userCredits)
      throw new Error("User not authenticated or credits not loaded");

    try {
      if (userCredits.credits_available < amount) {
        throw new Error("Insufficient credits");
      }

      // Mock implementation
      const updatedCredits: UserCredits = {
        ...userCredits,
        credits_available: userCredits.credits_available - amount,
        credits_used: userCredits.credits_used + amount,
        updated_at: toUTC().toISOString(),
      };

      setUserCredits(updatedCredits);

      toast({
        title: "Credits Used",
        description: `${amount} credits used${description ? ` for ${description}` : ""}`,
      });

      return updatedCredits;
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to use credits",
        variant: "destructive",
      });
      throw error;
    }
  };

  const earnCredits = async (amount: number, description?: string) => {
    if (!user || !userCredits)
      throw new Error("User not authenticated or credits not loaded");

    try {
      // Mock implementation
      const updatedCredits: UserCredits = {
        ...userCredits,
        credits_available: userCredits.credits_available + amount,
        credits_earned: userCredits.credits_earned + amount,
        last_earned_at: toUTC().toISOString(),
        updated_at: toUTC().toISOString(),
      };

      setUserCredits(updatedCredits);

      toast({
        title: "Credits Earned",
        description: `${amount} credits earned${description ? ` for ${description}` : ""}`,
      });

      return updatedCredits;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to earn credits",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    userCredits,
    credits: userCredits, // Legacy compatibility
    loading,
    fetchCredits,
    useCredits,
    earnCredits,
    refetch: fetchCredits,
  };
}
