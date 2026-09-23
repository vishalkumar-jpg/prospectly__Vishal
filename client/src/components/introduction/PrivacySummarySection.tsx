import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { Shield, Info, Plus } from "lucide-react";
import { AddPrivacyRuleDialog } from "./AddPrivacyRuleDialog";

interface PrivacyRule {
  id: string;
  domain: string;
  reason: string;
  hideProfile: boolean;
  hideBounties: boolean;
  excludeFromSearch: boolean;
  createdAt: string;
}

interface PrivacySummarySectionProps {
  onSelectedRulesChange?: (selectedRuleIds: string[]) => void;
}

export function PrivacySummarySection({
  onSelectedRulesChange,
}: PrivacySummarySectionProps) {
  // Track which rules are selected for this request
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(
    new Set()
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch privacy rules with hideBounties = true
  const { data, isLoading } = useQuery<{
    data: PrivacyRule[];
    total: number;
  }>({
    queryKey: [
      "/api/privacy",
      {
        isPagination: false,
        sort: "createdAt",
        order: "DESC",
      },
    ],
    queryFn: async () => {
      const result = await api.privacy.getAll({
        isPagination: false,
        sort: "createdAt",
        order: "DESC",
      });
      // Filter to only show rules with hideBounties = true
      const filteredData = result.data.filter((rule) => rule.hideBounties);
      return {
        ...result,
        data: filteredData,
        total: filteredData.length,
      };
    },
    staleTime: 30 * 1000,
  });

  const privacyRules = data?.data || [];
  const hasPrivacyRules = privacyRules.length > 0;

  // Track if we've initialized the selection (only once on first load)
  const [hasInitialized, setHasInitialized] = useState(false);
  // Track previous rule IDs to detect new rules being added
  const previousRuleIdsRef = useRef<Set<string>>(new Set());

  // Initialize all rules as selected by default when rules are loaded (only once, not when user unchecks all)
  useEffect(() => {
    if (privacyRules.length > 0 && !hasInitialized) {
      const allIds = new Set(privacyRules.map((rule) => rule.id));
      const allIdsArray = Array.from(allIds);
      setSelectedRuleIds(allIds);
      previousRuleIdsRef.current = allIds;
      // Call callback to notify parent of initial selection
      onSelectedRulesChange?.(allIdsArray);
      setHasInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privacyRules.length, hasInitialized]); // Only initialize once, onSelectedRulesChange is stable

  // Handle checkbox toggle
  const handleToggleRule = (
    ruleId: string,
    checked: boolean | "indeterminate"
  ) => {
    const isChecked = checked === true;
    setSelectedRuleIds((prev) => {
      const newSelected = new Set(prev);
      if (isChecked) {
        newSelected.add(ruleId);
      } else {
        newSelected.delete(ruleId);
      }
      const newArray = Array.from(newSelected);
      // Always call callback to notify parent of selection changes
      if (onSelectedRulesChange) {
        onSelectedRulesChange(newArray);
      }
      return newSelected;
    });
  };

  // When new rules are added, automatically select them (but don't interfere with user selections)
  // Extract rule IDs to a stable value for dependency array
  const ruleIdsString = privacyRules
    .map((r) => r.id)
    .sort((a, b) => a.localeCompare(b))
    .join(",");

  useEffect(() => {
    if (privacyRules.length > 0 && hasInitialized) {
      // Get all current rule IDs
      const currentRuleIds = new Set(privacyRules.map((rule) => rule.id));
      const previousRuleIds = previousRuleIdsRef.current;

      // Find rules that are new (exist now but didn't exist before)
      const newRules = Array.from(currentRuleIds).filter(
        (id) => !previousRuleIds.has(id)
      );

      // Only update if there are actually new rules
      if (newRules.length > 0) {
        setSelectedRuleIds((prev) => {
          const updatedSelected = new Set(prev);
          newRules.forEach((id) => updatedSelected.add(id));
          const newArray = Array.from(updatedSelected);
          // Notify parent of new selection
          onSelectedRulesChange?.(newArray);
          return updatedSelected;
        });
        // Update the ref to track current rules
        previousRuleIdsRef.current = currentRuleIds;
      } else {
        // Update ref even if no new rules (in case rules were removed)
        previousRuleIdsRef.current = currentRuleIds;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleIdsString, hasInitialized]); // Only watch for rule list changes, NOT selection changes

  // Format reason from slug to readable text (e.g., "direct_competitor" -> "Direct Competitor")
  const formatReason = (reason: string) => {
    return reason
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Don't render if no privacy rules
  if (!hasPrivacyRules && !isLoading) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base font-semibold text-amber-900">
                Privacy Settings
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-amber-50 border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              Select which privacy rules will be applied to this introduction
              request. Connectors matching selected domains will not receive
              this request.
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : privacyRules.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No privacy rules with hide bounties enabled.
            </div>
          ) : (
            <div className="space-y-2">
              {privacyRules.map((rule) => {
                const isSelected = selectedRuleIds.has(rule.id);
                return (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-200"
                  >
                    <Checkbox
                      id={`privacy-rule-${rule.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        handleToggleRule(rule.id, checked);
                      }}
                    />
                    <label
                      htmlFor={`privacy-rule-${rule.id}`}
                      className="flex-1 flex items-center gap-2 cursor-pointer"
                    >
                      <Badge variant="outline" className="font-mono text-xs">
                        {rule.domain}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatReason(rule.reason)}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Rule Dialog */}
      <AddPrivacyRuleDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
