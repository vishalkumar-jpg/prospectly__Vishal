import { useState, useEffect, useCallback } from "react";
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

export function usePrimaryPaymentMethod() {
  const [primaryPaymentMethod, setPrimaryPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrimaryPaymentMethod = useCallback(async () => {
    try {
      setLoading(true);

      // Use centralized API request which handles automatic token refresh
      const data = await apiRequest<{ paymentMethod: PaymentMethod | null }>(
        "/stripe/payment-methods/primary"
      );

      setPrimaryPaymentMethod(data.paymentMethod || null);
    } catch {
      // Don't show toast for missing primary payment method - it's expected in some cases
      setPrimaryPaymentMethod(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrimaryPaymentMethod();
  }, [fetchPrimaryPaymentMethod]);

  const hasPaymentMethods = primaryPaymentMethod !== null;

  return {
    primaryPaymentMethod,
    hasPaymentMethods,
    loading,
    fetchPrimaryPaymentMethod,
  };
}
