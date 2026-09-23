import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isPrimary: boolean;
  isExpired: boolean;
}

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [primaryPaymentMethodId, setPrimaryPaymentMethodId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);

      // Use centralized API request which handles automatic token refresh
      const data = await apiRequest<{
        paymentMethods: PaymentMethod[];
        primaryPaymentMethodId: string | null;
      }>("/stripe/payment-methods");

      setPaymentMethods(data.paymentMethods || []);
      setPrimaryPaymentMethodId(data.primaryPaymentMethodId);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load payment methods. Please try again.";
      toast({
        title: "Error Loading Payment Methods",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const addPaymentMethod = useCallback(
    async (paymentMethodId: string, setAsPrimary: boolean = false) => {
      try {
        if (setAsPrimary) {
          // Use centralized API request which handles automatic token refresh and CSRF tokens
          await apiRequest(
            `/stripe/payment-methods/${paymentMethodId}/set-default`,
            {
              method: "PATCH",
            }
          );
        }

        toast({
          title: "Payment Method Added",
          description: setAsPrimary
            ? "Your new card has been added and set as primary."
            : "Your new card has been added successfully.",
        });

        await fetchPaymentMethods();

        return { success: true };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to add payment method. Please try again.";
        toast({
          title: "Error Adding Payment Method",
          description: errorMessage,
          variant: "destructive",
        });
        return { success: false, error: errorMessage };
      }
    },
    [toast, fetchPaymentMethods]
  );

  const removePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      try {
        // Use centralized API request which handles automatic token refresh and CSRF tokens
        await apiRequest(`/stripe/payment-methods/${paymentMethodId}`, {
          method: "DELETE",
        });

        toast({
          title: "Payment Method Removed",
          description: "Your card has been removed successfully.",
        });

        await fetchPaymentMethods();

        return { success: true };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to remove payment method. Please try again.";
        toast({
          title: "Error Removing Payment Method",
          description: errorMessage,
          variant: "destructive",
        });
        return { success: false, error: errorMessage };
      }
    },
    [toast, fetchPaymentMethods]
  );

  const setPrimaryPaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      try {
        // Use centralized API request which handles automatic token refresh and CSRF tokens
        await apiRequest(
          `/stripe/payment-methods/${paymentMethodId}/set-default`,
          {
            method: "PATCH",
          }
        );

        toast({
          title: "Primary Payment Method Updated",
          description:
            "Your default payment method has been updated successfully.",
        });

        await fetchPaymentMethods();

        return { success: true };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update primary payment method. Please try again.";
        toast({
          title: "Error Updating Payment Method",
          description: errorMessage,
          variant: "destructive",
        });
        return { success: false, error: errorMessage };
      }
    },
    [toast, fetchPaymentMethods]
  );

  const primaryPaymentMethod =
    paymentMethods.find((pm) => pm.isPrimary) || null;
  const hasPaymentMethods = paymentMethods.length > 0;

  return {
    paymentMethods,
    primaryPaymentMethod,
    primaryPaymentMethodId,
    loading,
    hasPaymentMethods,
    fetchPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    setPrimaryPaymentMethod,
  };
}
