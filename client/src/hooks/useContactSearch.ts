import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { AnyType } from "@/types/common";

interface Contact {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  title: string | null;
  company: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  industry?: string | null;
  bounty_amount?: number | null;
  user_id?: string | null;
  profile_photo_url?: string | null;
  connector_count?: number;
}

export function useContactSearch(searchTerm: string) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !searchTerm || searchTerm.length < 2) {
      setContacts([]);
      return;
    }

    const searchContacts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use Express API for global contact search with owner details
        const response = await api.contacts.searchGlobal({
          q: searchTerm,
          limit: 50,
        });

        // Map backend camelCase to frontend snake_case
        const mappedContacts = response.contacts.map((contact: AnyType) => ({
          id: contact.id,
          first_name: contact.firstName,
          last_name: contact.lastName,
          email: contact.email,
          phone_number: contact.phoneNumber,
          title: contact.title,
          company: contact.company,
          city: contact.city,
          state: contact.state,
          country: contact.country,
          industry: contact.industry,
          bounty_amount: contact.bountyAmount,
          user_id: contact.userId,
          profile_photo_url: contact.profilePhotoUrl,
          connector_count: contact.potentialConnectorCount ?? 0,
        }));

        setContacts(mappedContacts);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to search contacts"
        );
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchContacts, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, user]);

  return { contacts, loading, error };
}
