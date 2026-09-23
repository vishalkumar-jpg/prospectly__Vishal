import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export interface BountyQCPage {
  id: string;
  title: string;
  description: string;
  page_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBountyQCPages() {
  const [pages, setPages] = useState<BountyQCPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPages = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use centralized API request which handles automatic token refresh
      const data = await apiRequest<BountyQCPage[]>("/bounties/qc-pages");
      setPages(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch QC pages";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addPage = async (
    newPage: Omit<
      BountyQCPage,
      "id" | "created_at" | "updated_at" | "is_active"
    >
  ) => {
    try {
      // Use centralized API request which handles automatic token refresh and CSRF tokens
      await apiRequest("/bounties/qc-pages", {
        method: "POST",
        body: JSON.stringify({
          title: newPage.title.trim(),
          description: newPage.description.trim(),
          page_path: newPage.page_path.trim(),
        }),
      });

      toast({
        title: "Success",
        description: "QC page added successfully",
      });

      await fetchPages();
      return true;
    } catch {
      toast({
        title: "Error",
        description: "Failed to add QC page",
        variant: "destructive",
      });
      return false;
    }
  };

  const updatePage = async (
    id: string,
    updates: Partial<Omit<BountyQCPage, "id" | "created_at" | "updated_at">>
  ) => {
    try {
      // Use centralized API request which handles automatic token refresh and CSRF tokens
      await apiRequest(`/bounties/qc-pages/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });

      toast({
        title: "Success",
        description: "QC page updated successfully",
      });

      await fetchPages();
      return true;
    } catch {
      toast({
        title: "Error",
        description: "Failed to update QC page",
        variant: "destructive",
      });
      return false;
    }
  };

  const deletePage = async (id: string) => {
    try {
      // Use centralized API request which handles automatic token refresh and CSRF tokens
      await apiRequest(`/bounties/qc-pages/${id}`, {
        method: "DELETE",
      });

      toast({
        title: "Success",
        description: "QC page removed successfully",
      });

      await fetchPages();
      return true;
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove QC page",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  return {
    pages,
    loading,
    error,
    addPage,
    updatePage,
    deletePage,
    refetch: fetchPages,
  };
}
