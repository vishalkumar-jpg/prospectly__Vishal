import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useBulkAddCollaborators,
  useCollaborationRoles,
  useEligibleCollaborators,
  useJobCollaborators,
  useRemoveCollaborator,
} from "@/hooks/useJobCollaborators";
import {
  permissionLabel,
  prettifyRoleName,
} from "@/lib/recruitment-permissions";
import { cn } from "@/lib/utils";
import type { JobCollaborator } from "@/lib/api/recruitment";

interface ManageCollaboratorsModalProps {
  jobId: string | null;
  jobTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function ManageCollaboratorsModal({
  jobId,
  jobTitle,
  open,
  onOpenChange,
}: ManageCollaboratorsModalProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [notify, setNotify] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<JobCollaborator | null>(
    null
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"add" | "current">("add");
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [showPerms, setShowPerms] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 400);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { roles, loading: rolesLoading } = useCollaborationRoles(
    jobId ?? undefined,
    open
  );
  const { collaborators, loading: rosterLoading } = useJobCollaborators(
    jobId ?? undefined,
    open
  );
  const {
    members,
    total,
    loading: membersLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEligibleCollaborators(jobId ?? undefined, debouncedSearch, open);
  const bulkMutation = useBulkAddCollaborators();
  const removeMutation = useRemoveCollaborator();

  // Default the role selection to the first available role once loaded.
  useEffect(() => {
    if (!roleId && roles.length > 0) setRoleId(roles[0].id);
  }, [roles, roleId]);

  const selectedRole = roles.find((r) => r.id === roleId);

  // Infinite scroll inside the list container (not the window).
  useEffect(() => {
    if (tab !== "add") return;
    const root = listContainerRef.current;
    const el = sentinelRef.current;
    if (!root || !el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root, rootMargin: "120px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    tab,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    members.length,
    open,
  ]);

  const handleOpenChange = (next: boolean) => {
    if (bulkMutation.isPending || removeMutation.isPending) return;
    if (!next) {
      setSearch("");
      setNotify(true);
      setTab("add");
      setSelectedIds(new Set());
      setRoleId(undefined);
      setShowPerms(false);
    }
    onOpenChange(next);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAdd = async () => {
    if (!jobId || selectedIds.size === 0) return;
    try {
      const result = await bulkMutation.mutateAsync({
        jobId,
        payload: { userIds: [...selectedIds], notify, roleId },
      });
      const skippedCount = result.skipped.length;
      const descParts: string[] = [];
      if (result.added > 0 && notify) descParts.push("They've been emailed.");
      if (skippedCount > 0)
        descParts.push(
          `${skippedCount} skipped (already a collaborator or ineligible).`
        );
      toast({
        title:
          result.added > 0
            ? `${result.added} collaborator${result.added === 1 ? "" : "s"} added`
            : "No collaborators added",
        description:
          descParts.join(" ") ||
          (result.added > 0
            ? "Collaborators can now access this job pipeline."
            : "No new collaborators were added to this job."),
        variant: result.added > 0 ? "default" : "destructive",
      });
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        title: "Failed to add collaborators",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async () => {
    if (!jobId || !removeTarget) return;
    try {
      await removeMutation.mutateAsync({
        jobId,
        collaboratorUserId: removeTarget.userId,
      });
      toast({
        title: "Collaborator removed",
        description: `${removeTarget.fullName || removeTarget.email} no longer has access to this job pipeline.`,
      });
      setRemoveTarget(null);
    } catch (error) {
      toast({
        title: "Failed to remove collaborator",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
          mobileFullscreen
          hideCloseButton
        >
          {/* Hero */}
          <div className="relative shrink-0 overflow-hidden bg-brand-hero-gradient p-6 text-white sm:p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-brand-hero-overlay"
            />
            <DialogClose className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
            <div className="relative flex items-center gap-3.5 pr-10">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-extrabold tracking-tight text-white">
                  Manage Collaborators
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="mt-1 text-[13px] leading-relaxed text-white/90">
                    Add co-workers to help manage candidates for{" "}
                    <span className="font-semibold text-white">{jobTitle}</span>
                    . They can't edit job details.
                  </div>
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as "add" | "current")}
              >
                <TabsList className="inline-flex h-10 w-full gap-1 rounded-xl border border-border bg-muted p-1">
                  <TabsTrigger
                    value="add"
                    className="group inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-brand-amethyst data-[state=active]:shadow-sm"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Add</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="current"
                    className="group inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-brand-amethyst data-[state=active]:shadow-sm"
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Current</span>
                    <Badge
                      variant="secondary"
                      className="ml-1 rounded-full border-0 bg-card px-2 py-0.5 text-[11px] font-bold text-muted-foreground group-data-[state=active]:bg-brand-amethyst/10 group-data-[state=active]:text-brand-amethyst"
                    >
                      {collaborators.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                {/* Add collaborators */}
                <TabsContent
                  value="add"
                  className="mt-5 min-h-[320px] space-y-3"
                >
                  {/* Role selection + what it can do */}
                  <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Role
                    </Label>
                    <Select
                      value={roleId}
                      onValueChange={setRoleId}
                      disabled={rolesLoading || roles.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            rolesLoading ? "Loading roles…" : "Select a role"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {prettifyRoleName(r.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedRole && selectedRole.permissions.length > 0 && (
                      <Collapsible open={showPerms} onOpenChange={setShowPerms}>
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              showPerms && "rotate-90"
                            )}
                          />
                          What can this role do?
                        </CollapsibleTrigger>
                        <CollapsibleContent className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2">
                          {selectedRole.permissions.map((p) => (
                            <span
                              key={p}
                              className="flex items-center gap-1.5 text-xs text-foreground"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <span className="truncate">
                                {permissionLabel(p)}
                              </span>
                            </span>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search your organization members"
                      className="pl-9"
                    />
                  </div>

                  <div
                    ref={listContainerRef}
                    className="max-h-[300px] space-y-1 overflow-y-auto"
                  >
                    {membersLoading ? (
                      [...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-11 rounded-lg" />
                      ))
                    ) : members.length === 0 ? (
                      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                        No eligible members found.
                      </p>
                    ) : (
                      <>
                        {members.map((m) => (
                          <label
                            key={m.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                          >
                            <Checkbox
                              checked={selectedIds.has(m.id)}
                              onCheckedChange={() => toggleSelected(m.id)}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={m.profilePhotoUrl ?? undefined}
                              />
                              <AvatarFallback className="text-xs">
                                {initials(m.fullName, m.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {m.fullName || m.email}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {m.jobTitle || m.email}
                              </p>
                            </div>
                          </label>
                        ))}
                        {hasNextPage && (
                          <div ref={sentinelRef} className="h-1" aria-hidden />
                        )}
                        {isFetchingNextPage && (
                          <div className="flex justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <label className="mt-2 flex cursor-pointer items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                    <Checkbox
                      checked={notify}
                      onCheckedChange={(v) => setNotify(v === true)}
                    />
                    Send an email to let them know they've been added
                  </label>
                </TabsContent>

                {/* Current collaborators */}
                <TabsContent
                  value="current"
                  className="mt-5 min-h-[320px] space-y-3"
                >
                  {rosterLoading ? (
                    <div className="space-y-2">
                      {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-lg" />
                      ))}
                    </div>
                  ) : collaborators.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                      No collaborators yet. Switch to the Add tab to add a
                      co-worker.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {collaborators.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={c.profilePhotoUrl ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {initials(c.fullName, c.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {c.fullName || c.email}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.email}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="hidden shrink-0 text-[10px] uppercase tracking-wider sm:inline-flex"
                          >
                            {c.roleName?.replace(/_/g, " ") || "collaborator"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive focus-visible:ring-destructive/30"
                            onClick={() => setRemoveTarget(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {tab === "add" && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card p-4">
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size > 0 ? (
                    <>
                      {selectedIds.size} selected ·{" "}
                      <button
                        type="button"
                        className="underline transition-colors hover:text-foreground"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Clear
                      </button>
                    </>
                  ) : total > 0 ? (
                    `${members.length} of ${total.toLocaleString()} shown`
                  ) : null}
                </span>
                <Button
                  onClick={handleBulkAdd}
                  disabled={
                    selectedIds.size === 0 ||
                    bulkMutation.isPending ||
                    (roles.length > 0 && !roleId)
                  }
                  className="bg-brand-gradient font-semibold text-brand-foreground shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
                >
                  {bulkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-1.5 h-4 w-4" />
                      Add
                      {selectedIds.size > 0 ? ` ${selectedIds.size}` : ""}{" "}
                      selected
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(o) => {
          if (!o && !removeMutation.isPending) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove collaborator?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.fullName || removeTarget?.email} will immediately
              lose access to this job and its candidates. You can re-add them
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
              disabled={removeMutation.isPending}
              className="bg-brand-destructive text-brand-foreground hover:bg-brand-destructive/90"
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
