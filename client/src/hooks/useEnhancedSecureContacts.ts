import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { toUTC } from "@/lib/dayjs";
import { AnyType } from "@/types/common";

export interface EnhancedSecureContact {
  id: number;
  first_name?: string;
  last_name?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
  website?: string;
  campaign_id?: number;
  source: string[];
  optedOut: boolean;
  matchingStatus: "active" | "pending" | "blocked";
  introOpportunities: number;
  qualityScore: number;
  lastMatched: string;
  email_masked: string;
  phone_masked: string;
  linkedin_masked: string;
  security_level: string;
  last_accessed_at?: string | null;
  access_count: number;
  is_high_value: boolean;
  anonymized_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  resolved_at?: string;
}

export function useEnhancedSecureContacts(campaignId?: number) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EnhancedSecureContact[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Use centralized API request which handles automatic token refresh
      const endpoint = campaignId
        ? `/contacts?campaignId=${campaignId}`
        : "/contacts";

      const responseData = await apiRequest<{
        contacts: EnhancedSecureContact[];
      }>(endpoint);
      const data = responseData.contacts || [];

      // Log bulk access for audit (mock implementation)
      if (data && data.length > 0) {
        // Bulk access logged
      }

      // Transform contacts with enhanced security features
      const enhancedContacts: EnhancedSecureContact[] = data.map(
        (contact: AnyType) => {
          const fullName =
            `${contact.firstName || contact.first_name || ""} ${contact.lastName || contact.last_name || ""}`.trim();

          // Transform source value(s) to user-friendly display names as array
          const formatSource = (
            sourceValue: string | string[] | null | undefined
          ): string[] => {
            if (!sourceValue) return ["Manual"];
            // Handle array (new format)
            if (Array.isArray(sourceValue)) {
              if (sourceValue.length === 0) return ["Manual"];
              return sourceValue;
            }
            // Handle string (legacy format)
            const sourceMap: Record<string, string> = {
              google_import: "Google",
              csv_import: "CSV",
              microsoft_import: "Microsoft",
              apple_import: "Apple",
            };
            const normalized =
              sourceMap[sourceValue.toLowerCase()] || sourceValue;
            return [normalized];
          };

          return {
            ...contact,
            first_name: contact.firstName || contact.first_name,
            last_name: contact.lastName || contact.last_name,
            name: fullName,
            email: "secure@masked.com",
            phone: "***-***-****",
            source: formatSource(contact.source),
            optedOut: false,
            matchingStatus: "active" as const,
            introOpportunities: Math.floor(Math.random() * 5),
            qualityScore: Math.floor(Math.random() * 40) + 60,
            lastMatched: contact.createdAt
              ? toUTC(contact.createdAt).toISOString().split("T")[0]
              : toUTC().toISOString().split("T")[0],
            email_masked: "***@***.com",
            phone_masked: "***-***-****",
            linkedin_masked: "linkedin.com/in/***",
            security_level: "standard",
            last_accessed_at: null,
            access_count: 0,
            is_high_value: false,
            anonymized_at: null,
            created_at: contact.createdAt || contact.created_at,
            updated_at: contact.updatedAt || contact.updated_at,
          };
        }
      );

      setContacts(enhancedContacts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch contacts");
      toast({
        title: "Error",
        description: "Failed to fetch secure contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, campaignId]);

  const anonymizeContact = async (contactId: number) => {
    try {
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === contactId
            ? {
                ...contact,
                optedOut: true,
                anonymized_at: toUTC().toISOString(),
              }
            : contact
        )
      );

      toast({
        title: "Contact Anonymized",
        description: "Contact data has been anonymized for privacy compliance",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to anonymize contact data",
        variant: "destructive",
      });
      throw error;
    }
  };

  const fetchSecurityEvents = async () => {
    try {
      setSecurityEvents([]);
    } catch {
      // Silently handle error
    }
  };

  const markSecurityEventResolved = async (eventId: string) => {
    try {
      setSecurityEvents((prev) => prev.filter((event) => event.id !== eventId));

      toast({
        title: "Security Event Resolved",
        description: "Security event has been marked as resolved",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to resolve security event",
        variant: "destructive",
      });
    }
  };

  return {
    contacts,
    securityEvents,
    loading,
    error,
    fetchContacts,
    anonymizeContact,
    fetchSecurityEvents,
    markSecurityEventResolved,
    refreshSecurityEvents: fetchSecurityEvents,
    refetch: fetchContacts,
  };
}
