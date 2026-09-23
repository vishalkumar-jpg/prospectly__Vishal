import { useState } from "react";
import { useQuery, useMutation, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Ban,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AddDialog, type PrivacyData } from "./AddDialog";
import { DeleteDialog } from "./DeleteDialog";
import { formatStandardDate } from "@/utils/dateFormatter";
import { Loader } from "@/components/ui/loader";

interface PrivacySectionProps {
  privacyPage: number;
  setPrivacyPage: (page: number) => void;
  privacyLimit: number;
  setPrivacyLimit: (limit: number) => void;
  privacySearch: string;
  setPrivacySearch: (search: string) => void;
  isPrivacyDialogOpen: boolean;
  setIsPrivacyDialogOpen: (open: boolean) => void;
  editingPrivacy: { id: string; data: PrivacyData } | null;
  setEditingPrivacy: (
    privacy: { id: string; data: PrivacyData } | null
  ) => void;
  deletingPrivacy: { id: string; domain: string } | null;
  setDeletingPrivacy: (privacy: { id: string; domain: string } | null) => void;
  queryClient: QueryClient;
  toast: ReturnType<typeof useToast>["toast"];
}

export function PrivacySectionContent({
  privacyPage,
  setPrivacyPage,
  privacyLimit,
  privacySearch,
  setPrivacySearch,
  isPrivacyDialogOpen,
  setIsPrivacyDialogOpen,
  editingPrivacy,
  setEditingPrivacy,
  deletingPrivacy,
  setDeletingPrivacy,
  queryClient,
  toast,
}: PrivacySectionProps) {
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Fetch privacy settings
  const { data, isLoading, isFetching } = useQuery<{
    data: Array<{
      id: string;
      domain: string;
      reason: string;
      hideProfile: boolean;
      hideBounties: boolean;
      excludeFromSearch: boolean;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: [
      "/api/privacy",
      {
        page: privacyPage,
        limit: privacyLimit,
        search: privacySearch || undefined,
        sort: "createdAt",
        order: "DESC",
        isPagination: true,
      },
    ],
    staleTime: 30 * 1000,
  });

  const privacySettings = data?.data || [];
  const pagination = {
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    totalPages: data?.totalPages || 1,
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: PrivacyData) => api.privacy.create(data),
    onSuccess: async () => {
      setDialogError(null);
      setIsPrivacyDialogOpen(false);
      toast({
        title: "Privacy Setting Added",
        description: "The privacy setting has been added successfully.",
      });
      // Invalidate and refetch after closing dialog
      await queryClient.invalidateQueries({
        queryKey: ["/api/privacy"],
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to add privacy setting.";
      setDialogError(errorMessage);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PrivacyData }) =>
      api.privacy.update(id, data),
    onSuccess: async () => {
      setDialogError(null);
      setIsPrivacyDialogOpen(false);
      setEditingPrivacy(null);
      toast({
        title: "Privacy Setting Updated",
        description: "The privacy setting has been updated successfully.",
      });
      // Invalidate and refetch after closing dialog
      await queryClient.invalidateQueries({
        queryKey: ["/api/privacy"],
      });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to update privacy setting.";
      setDialogError(errorMessage);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.privacy.delete(ids),
    onSuccess: async () => {
      setDeletingPrivacy(null);
      toast({
        title: "Privacy Setting Deleted",
        description: "The privacy setting has been deleted successfully.",
      });
      // Invalidate and refetch after closing dialog
      await queryClient.invalidateQueries({
        queryKey: ["/api/privacy"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete privacy setting.",
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: PrivacyData) => {
    setDialogError(null);

    if (editingPrivacy) {
      updateMutation.mutate({ id: editingPrivacy.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (privacy: (typeof privacySettings)[0]) => {
    setEditingPrivacy({
      id: privacy.id,
      data: {
        domain: privacy.domain,
        reason: privacy.reason,
        hideProfile: privacy.hideProfile,
        hideBounties: privacy.hideBounties,
        excludeFromSearch: privacy.excludeFromSearch,
      },
    });
    setDialogError(null);
    setIsPrivacyDialogOpen(true);
  };

  const handleDelete = (privacy: (typeof privacySettings)[0]) => {
    setDeletingPrivacy({
      id: privacy.id,
      domain: privacy.domain,
    });
  };

  const confirmDelete = () => {
    if (deletingPrivacy) {
      deleteMutation.mutate([deletingPrivacy.id]);
    }
  };

  const formatReason = (reason: string) => {
    return reason
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      <Card className="rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-success/10 text-brand-success">
                <Ban className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg font-extrabold tracking-tight">
                  Privacy Management
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Block companies from seeing your information or reaching out
                  to you
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingPrivacy(null);
                setDialogError(null);
                setIsPrivacyDialogOpen(true);
              }}
              className="w-full flex-shrink-0 bg-brand-gradient text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Privacy
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search domains..."
              value={privacySearch}
              onChange={(e) => {
                setPrivacySearch(e.target.value);
                setPrivacyPage(1);
              }}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          ) : (
            <>
              <div className="relative overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                {/* Show loader overlay when refetching after mutations (isFetching && !isLoading means it's a refetch, not initial load) */}
                {isFetching && !isLoading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-md">
                    <Loader />
                  </div>
                )}
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent [&>th]:text-xs [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-wide">
                      <TableHead className="w-[25%] min-w-[140px]">
                        Domain
                      </TableHead>
                      <TableHead className="w-[20%] min-w-[120px]">
                        Reason
                      </TableHead>
                      <TableHead className="w-[25%] min-w-[140px]">
                        Blocking Options
                      </TableHead>
                      <TableHead className="w-[20%] min-w-[120px] whitespace-nowrap">
                        Date Added
                      </TableHead>
                      <TableHead className="w-[10%] min-w-[80px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {privacySettings.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Ban className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-muted-foreground font-medium">
                              No privacy settings configured.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Click "Add Privacy" to block a domain
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      privacySettings.map((privacy) => (
                        <TableRow
                          key={privacy.id}
                          className="group hover:bg-muted/50 transition-colors border-b border-border/50"
                        >
                          <TableCell className="py-4">
                            <span className="font-medium text-foreground">
                              {privacy.domain}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="text-xs">
                              {formatReason(privacy.reason)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {privacy.hideProfile && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs whitespace-nowrap"
                                >
                                  Profile Hidden
                                </Badge>
                              )}
                              {privacy.hideBounties && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs whitespace-nowrap"
                                >
                                  Introduction Requests Hidden
                                </Badge>
                              )}
                              {/* {privacy.excludeFromSearch && (
                                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                  Search Excluded
                                </Badge>
                              )} */}
                              {!privacy.hideProfile &&
                                !privacy.hideBounties && (
                                  <span className="text-sm text-muted-foreground">
                                    —
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatStandardDate(privacy.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEdit(privacy)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(privacy)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{" "}
                    of {pagination.total} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrivacyPage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrivacyPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Privacy Dialog */}
      <AddDialog
        open={isPrivacyDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Only allow closing if mutations are not in progress
            if (!createMutation.isPending && !updateMutation.isPending) {
              setIsPrivacyDialogOpen(false);
              setEditingPrivacy(null);
              setDialogError(null);
            }
          } else {
            setIsPrivacyDialogOpen(true);
            setDialogError(null);
          }
        }}
        onSave={handleSave}
        editMode={!!editingPrivacy}
        initialData={editingPrivacy?.data || null}
        isLoading={createMutation.isPending || updateMutation.isPending}
        error={dialogError}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={!!deletingPrivacy}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingPrivacy(null);
          }
        }}
        domain={deletingPrivacy?.domain || ""}
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
