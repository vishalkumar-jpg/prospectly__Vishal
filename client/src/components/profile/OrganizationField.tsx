import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Lock,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCompletionOrganisations } from "@/hooks/useCompletionOrganisations";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { CurrentOrganization } from "@/lib/api/profiles";
import { cn } from "@/lib/utils";

/** Either an existing organization or a name staged for creation on save. */
export type OrganizationSelection =
  | { kind: "existing"; id: string; name: string; isActive: boolean }
  | { kind: "new"; name: string }
  | null;

interface OrganizationFieldProps {
  value: OrganizationSelection;
  onChange: (value: OrganizationSelection) => void;
  /** Existing membership. When set the field is locked. */
  current?: CurrentOrganization | null;
}

function PendingBadge() {
  return (
    <Badge className="gap-1 border-amber-200 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">
      <Clock className="h-3 w-3" aria-hidden />
      Pending approval
    </Badge>
  );
}

function VerifiedBadge() {
  return (
    <Badge className="gap-1 border-emerald-200 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">
      <CheckCircle2 className="h-3 w-3" aria-hidden />
      Verified
    </Badge>
  );
}

function FieldLabel() {
  return (
    <Label htmlFor="organization" className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      Organization
    </Label>
  );
}

export function OrganizationField({
  value,
  onChange,
  current,
}: OrganizationFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { organisations, total, loading } = useCompletionOrganisations(
    debouncedSearch,
    !current
  );

  const trimmedSearch = search.trim();

  const canCreate = useMemo(() => {
    if (trimmedSearch.length < 2) return false;

    return !organisations.some(
      (org) => org.name.toLowerCase() === trimmedSearch.toLowerCase()
    );
  }, [organisations, trimmedSearch]);

  const hasMoreResults = total > organisations.length;

  if (current) {
    return (
      <div className="space-y-2">
        <FieldLabel />
        <div className="flex h-11 items-center gap-2 rounded-md border border-input bg-muted/40 px-3">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="flex-1 truncate text-sm">{current.name}</span>
          {current.isVerified ? <VerifiedBadge /> : <PendingBadge />}
        </div>
        <p className="text-xs text-muted-foreground">
          Managed by your organization.
        </p>
      </div>
    );
  }

  const select = (selection: OrganizationSelection) => {
    onChange(selection);
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <FieldLabel />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            id="organization"
            aria-expanded={open}
            className="h-11 w-full justify-between px-3 font-normal"
          >
            {value ? (
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate">{value.name}</span>
                {value.kind === "new" || !value.isActive ? (
                  <PendingBadge />
                ) : null}
              </span>
            ) : (
              <span className="flex-1 text-left text-muted-foreground">
                Search for your organization
              </span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          {/* Server-side search is authoritative, so cmdk must not filter again. */}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search organizations..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Searching...
                </div>
              ) : (
                <>
                  {!organisations.length && !canCreate ? (
                    <CommandEmpty>No organizations found.</CommandEmpty>
                  ) : null}

                  {organisations.length ? (
                    <CommandGroup>
                      {organisations.map((org) => (
                        <CommandItem
                          key={org.id}
                          value={org.id}
                          onSelect={() =>
                            select({
                              kind: "existing",
                              id: org.id,
                              name: org.name,
                              isActive: org.isActive,
                            })
                          }
                          className="flex items-center gap-2"
                        >
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              value?.kind === "existing" && value.id === org.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="flex-1 truncate text-sm">
                            {org.name}
                          </span>
                          {org.isActive ? null : <PendingBadge />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}

                  {hasMoreResults ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      Keep typing to narrow these results.
                    </p>
                  ) : null}

                  {canCreate ? (
                    <CommandGroup>
                      <CommandItem
                        value={`create-${trimmedSearch}`}
                        onSelect={() =>
                          select({ kind: "new", name: trimmedSearch })
                        }
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="flex-1 truncate text-sm">
                          Add &quot;{trimmedSearch}&quot; as a new organization
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  ) : null}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
