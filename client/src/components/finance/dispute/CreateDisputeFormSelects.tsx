import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormContext } from "react-hook-form";
import { DISPUTE_TYPES, DISPUTE_TYPE_LABELS } from "@/types/dispute";
import { useDisputes } from "@/hooks/useDisputes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export function CreateDisputeFormSelects() {
  const form = useFormContext();
  const {
    eligibleIntroductions,
    setEligibleSearch,
    loading: loadingEligible,
    setEligibleLimit,
    eligiblePagination,
  } = useDisputes();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  // Local state to store the display text of the selected introduction
  // This ensures the selected value is still shown even if pagination/filtering moves it out of eligibleIntroductions list
  const [selectedIntroductionDisplay, setSelectedIntroductionDisplay] =
    useState<string>("");

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setEligibleSearch(searchValue);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchValue, setEligibleSearch]);

  return (
    <>
      <FormField
        control={form.control}
        name="introductionRequestId"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-foreground">
              Select Introduction <span className="text-destructive">*</span>
            </FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                      "w-full justify-between font-normal overflow-hidden",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate flex-1 text-left min-w-0 mr-2">
                      {field.value
                        ? (() => {
                            const selected = eligibleIntroductions.find(
                              (intro) => intro.id === field.value
                            );
                            return selected
                              ? `${selected.meetingTitle || "No Title"} (${selected.contactName})`
                              : selectedIntroductionDisplay ||
                                  "Choose an introduction";
                          })()
                        : "Choose an introduction"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command shouldFilter={false} className="w-full">
                  <CommandInput
                    placeholder="Search introduction..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList className="max-h-[300px] overflow-y-auto">
                    {loadingEligible && eligibleIntroductions.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Loading introductions...
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No introduction found.</CommandEmpty>
                        <CommandGroup>
                          {eligibleIntroductions.map((intro) => (
                            <CommandItem
                              key={intro.id}
                              value={intro.id}
                              onSelect={() => {
                                form.setValue(
                                  "introductionRequestId",
                                  intro.id,
                                  { shouldValidate: true }
                                );
                                form.setValue(
                                  "disputedAmount",
                                  intro.bountyAmount,
                                  { shouldValidate: true }
                                );
                                setSelectedIntroductionDisplay(
                                  `${intro.meetingTitle || "No Title"} (${intro.contactName})`
                                );
                                setOpen(false);
                              }}
                              className="flex items-center px-2 py-2 cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  field.value === intro.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="truncate flex-1 min-w-0">
                                {intro.meetingTitle || "No Title"} (
                                {intro.contactName})
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {eligiblePagination.page <
                          eligiblePagination.totalPages && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs"
                              disabled={loadingEligible}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEligibleLimit((prev) => prev + 10);
                              }}
                            >
                              {loadingEligible
                                ? "Loading..."
                                : "Load more introductions"}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="disputeType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">
                Dispute Type <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Reason for dispute" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DISPUTE_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {DISPUTE_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">
                Priority <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
