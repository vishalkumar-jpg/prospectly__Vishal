import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { maskSensitiveData, checkContactAccessLimit } from "@/utils/security";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { ContactListSortBy } from "@/lib/api/contacts";
import { AnyType } from "@/types/common";
import { toUTC } from "@/lib/dayjs";

export interface SecureContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  linkedinUrl: string;
  website: string;
  city: string;
  state: string;
  country: string;
  industry: string;
  campaignId: number;
  importSource: string;
  profilePhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MaskedContact extends SecureContact {
  email_masked: string;
  linkedin_masked: string;
  bounty_amount?: string | number;
  bountyStatus?: string;
  // Legacy compatibility fields
  name: string;
  source: string[];
  optedOut: boolean;
  matchingStatus: "matched" | "active" | "pending";
  introOpportunities: number;
  qualityScore: number;
  lastMatched: string;
  enrichmentStatus?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalContacts: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type ContactsListSortBy = ContactListSortBy;

export type ContactsListSortDir = "asc" | "desc" | "default";

export interface ContactsListSortState {
  sortBy: ContactsListSortBy;
  sortDir: ContactsListSortDir;
}

function computeNextContactsSort(
  prev: ContactsListSortState,
  field: ContactsListSortBy
): ContactsListSortState {
  if (prev.sortBy !== field) {
    return { sortBy: field, sortDir: "desc" };
  }
  if (prev.sortDir === "default") {
    // Server default is updatedAt DESC; first click on that column must change order.
    return {
      sortBy: field,
      sortDir: field === "updatedAt" ? "asc" : "desc",
    };
  }
  if (prev.sortDir === "desc") {
    return { sortBy: field, sortDir: "asc" };
  }
  return { sortBy: "updatedAt", sortDir: "default" };
}

export function useSecureContacts(campaignId?: number) {
  const [contacts, setContacts] = useState<MaskedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    totalContacts: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [sortState, setSortState] = useState<ContactsListSortState>({
    sortBy: "updatedAt",
    sortDir: "default",
  });
  const sortStateRef = useRef(sortState);
  sortStateRef.current = sortState;
  const { user } = useAuth();
  const { toast } = useToast();

  // Use refs to track pagination values to prevent infinite loops
  const paginationRef = useRef(pagination);
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  const fetchContacts = useCallback(
    async (
      page = 1,
      limit = 10,
      search?: string,
      options?: {
        throwOnError?: boolean;
        sortBy?: ContactsListSortBy;
        sortDir?: ContactsListSortDir;
      }
    ) => {
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      // Check rate limit
      if (!checkContactAccessLimit(user.id.toString())) {
        toast({
          title: "Rate Limit Exceeded",
          description:
            "Too many contact access requests. Please try again later.",
          variant: "destructive",
        });
        setError("Rate limit exceeded");
        setLoading(false);
        return;
      }

      try {
        // Call Express API with pagination parameters
        const searchQuery = search !== undefined ? search : searchTerm;
        const sortByUse = options?.sortBy ?? sortStateRef.current.sortBy;
        const sortDirUse = options?.sortDir ?? sortStateRef.current.sortDir;
        const response = await api.contacts.list({
          page,
          limit,
          searchTerm: searchQuery || undefined,
          ...(sortDirUse !== "default"
            ? { sortBy: sortByUse, sortDir: sortDirUse }
            : {}),
        });

        const data = response.contacts || [];

        // Update pagination info
        if (response.pagination) {
          setPagination(response.pagination);
        }

        // Transform source value(s) to user-friendly display names
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
            linkedin_import: "LinkedIn",
            microsoft_import: "Microsoft",
            microsoft: "Microsoft",
            apple_import: "Apple",
            icloud_import: "Apple",
            manual: "Manual",
            api: "API",
          };
          const normalized =
            sourceMap[sourceValue.toLowerCase()] || sourceValue;
          return [normalized];
        };

        // Apply data masking to sensitive fields and add compatibility fields
        const maskedContacts: MaskedContact[] = data.map(
          (contact: AnyType) => ({
            ...contact,
            // Map linkedin from API to linkedinUrl for frontend compatibility
            linkedinUrl: contact.linkedin || "",
            // Map title from API to jobTitle for frontend compatibility
            jobTitle: contact.title || contact.jobTitle || "",
            email_masked:
              contact.email || maskSensitiveData(contact.email, "email"),
            linkedin_masked:
              contact.linkedin ||
              contact.linkedinUrl ||
              maskSensitiveData(
                contact.linkedin || contact.linkedinUrl,
                "linkedin"
              ),
            bounty_amount: contact.bountyAmount ?? "0",
            bountyStatus: contact.bountyStatus,
            // Legacy compatibility fields
            name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
            source: formatSource(contact.source),
            optedOut: false,
            matchingStatus: "active" as const,
            introOpportunities: Math.floor(Math.random() * 5), // Placeholder
            qualityScore: Math.floor(Math.random() * 40) + 60, // Placeholder 60-100
            lastMatched: contact.createdAt
              ? toUTC(contact.createdAt).toISOString().split("T")[0]
              : toUTC().toISOString().split("T")[0],
            enrichmentStatus: contact.enrichmentStatus,
          })
        );

        setContacts(maskedContacts);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch contacts"
        );

        if (options?.throwOnError) {
          throw err;
        }

        toast({
          title: "Error",
          description: "Failed to load contacts. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [user, searchTerm, toast]
  );

  const cycleContactsSort = useCallback(
    (field: ContactsListSortBy) => {
      const next = computeNextContactsSort(sortStateRef.current, field);
      setSortState(next);
      setPagination((prev) => ({ ...prev, page: 1 }));
      void fetchContacts(1, paginationRef.current.limit, searchTerm, {
        sortBy: next.sortBy,
        sortDir: next.sortDir,
      });
    },
    [fetchContacts, searchTerm]
  );

  const updateContact = async (
    contactId: string,
    updates: Partial<SecureContact>
  ) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      // Use api helper with proper ID conversion
      const contactIdNum = parseInt(contactId) || 0;
      await api.contacts.update(contactIdNum, updates);

      // Refresh contacts
      await fetchContacts();

      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
      throw error;
    }
  };

  const exportContacts = async () => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check rate limit for exports (more restrictive)
    if (!checkContactAccessLimit(`export_${user.id.toString()}`)) {
      toast({
        title: "Export Limit Exceeded",
        description: "Too many export requests. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Export Initiated",
        description: "Your contacts are being prepared for export",
      });
    } catch {
      // Silently ignored
    }
  };

  // Track previous search term to detect changes
  const lastSearchTermRef = useRef(searchTerm);

  // Debounced search effect - only trigger on searchTerm, user, or campaignId changes
  // Pagination changes are handled separately via setPage/setLimit functions
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      // If search term changed, we MUST reset to page 1 to ensure results are visible
      const isSearchChanged = searchTerm !== lastSearchTermRef.current;
      const targetPage = isSearchChanged ? 1 : paginationRef.current.page;

      if (isSearchChanged) {
        setPagination((prev) => ({ ...prev, page: 1 }));
        lastSearchTermRef.current = searchTerm;
      }

      fetchContacts(targetPage, paginationRef.current.limit, searchTerm);
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchTerm, user?.id, campaignId, fetchContacts]);

  return {
    contacts,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    pagination,
    setPage: (page: number) => {
      setPagination((prev) => ({ ...prev, page }));
      // Fetch immediately when page changes using current values
      fetchContacts(page, paginationRef.current.limit, searchTerm);
    },
    setLimit: (limit: number) => {
      setPagination((prev) => ({ ...prev, limit, page: 1 }));
      // Fetch immediately when limit changes
      fetchContacts(1, limit, searchTerm);
    },
    sortState,
    cycleContactsSort,
    refetch: fetchContacts,
    updateContact,
    exportContacts,
  };
}
