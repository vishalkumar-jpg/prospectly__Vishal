import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface BountyStage {
  id: string;
  stageId: string;
  title: string;
  description: string;
  percentage: number;
  stageOrder: number;
  icon: string;
  color: string;
  isActive: boolean;
}

interface ApiBountyStage {
  id: string;
  stageId: string;
  title: string;
  description: string;
  percentage: number;
  stageOrder: number;
  icon: string;
  color: string;
  isActive: boolean;
}

// Map the API response (snake_case) to the hook interface (camelCase)
const transformStage = (stage: ApiBountyStage): BountyStage => ({
  id: stage.id,
  stageId: stage.stageId,
  title: stage.title,
  description: stage.description,
  percentage: stage.percentage,
  stageOrder: stage.stageOrder,
  icon: stage.icon,
  color: stage.color,
  isActive: stage.isActive,
});

/** Keep one row per stageId (DB may contain legacy duplicates). */
function dedupeStagesByStageId(stages: BountyStage[]): BountyStage[] {
  const byStageId = new Map<string, BountyStage>();

  for (const stage of stages) {
    const existing = byStageId.get(stage.stageId);
    if (!existing) {
      byStageId.set(stage.stageId, stage);
      continue;
    }
    // Prefer lower stageOrder; tie-break on active flag
    if (
      stage.stageOrder < existing.stageOrder ||
      (stage.stageOrder === existing.stageOrder &&
        stage.isActive &&
        !existing.isActive)
    ) {
      byStageId.set(stage.stageId, stage);
    }
  }

  return Array.from(byStageId.values()).sort(
    (a, b) => a.stageOrder - b.stageOrder
  );
}

export function useBountyStages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch stages using React Query
  const {
    data: stagesData = [],
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useQuery<ApiBountyStage[]>({
    queryKey: ["/api/bounty-stages"],
  });

  // Transform the data with useMemo to prevent unnecessary re-renders
  const stages: BountyStage[] = useMemo(
    () => dedupeStagesByStageId(stagesData.map(transformStage)),
    [stagesData]
  );

  const error = fetchError instanceof Error ? fetchError.message : null;

  const updateStagePercentage = async (
    stageId: string,
    newPercentage: number
  ) => {
    try {
      await apiRequest(`/api/bounty-stages/${stageId}/percentage`, {
        method: "PATCH",
        body: JSON.stringify({ percentage: newPercentage }),
        headers: { "Content-Type": "application/json" },
      });

      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/bounty-stages"] });

      return true;
    } catch {
      toast({
        title: "Error",
        description: "Failed to update stage percentage",
        variant: "destructive",
      });
      return false;
    }
  };

  const resetToDefaults = async () => {
    try {
      const defaultPercentages = {
        request_accepted: 5,
        intro_sent: 10,
        response_received: 15,
        meeting_booked: 20,
        meeting_completed: 20,
        peer_feedback: 15,
        platform_fee: 15,
      };

      // Update all stages individually
      for (const [stageId, percentage] of Object.entries(defaultPercentages)) {
        await apiRequest(`/api/bounty-stages/${stageId}/percentage`, {
          method: "PATCH",
          body: JSON.stringify({ percentage }),
          headers: { "Content-Type": "application/json" },
        });
      }

      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/bounty-stages"] });
      return true;
    } catch {
      toast({
        title: "Error",
        description: "Failed to reset to default values",
        variant: "destructive",
      });
      return false;
    }
  };

  const saveAllStages = async (stagesToSave: BountyStage[]) => {
    try {
      // Update each stage individually
      for (const stage of stagesToSave) {
        await apiRequest(`/api/bounty-stages/${stage.stageId}/percentage`, {
          method: "PATCH",
          body: JSON.stringify({ percentage: stage.percentage }),
          headers: { "Content-Type": "application/json" },
        });
      }

      toast({
        title: "Success",
        description: "Bounty percentages saved successfully",
      });

      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/bounty-stages"] });
      return true;
    } catch {
      toast({
        title: "Error",
        description: "Failed to save bounty percentages",
        variant: "destructive",
      });
      return false;
    }
  };

  const addStage = async (
    _newStage: Omit<BountyStage, "id">
  ): Promise<boolean> => {
    // TODO: Implement POST /api/bounty-stages endpoint
    toast({
      title: "Not Implemented",
      description: "Add stage functionality not yet implemented",
      variant: "destructive",
    });
    return false;
  };

  const updateStage = async (
    stageId: string,
    updates: Partial<BountyStage>
  ): Promise<boolean> => {
    try {
      await apiRequest(`/api/bounty-stages/${stageId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
        headers: { "Content-Type": "application/json" },
      });

      toast({
        title: "Success",
        description: "Stage updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/bounty-stages"] });
      return true;
    } catch {
      toast({
        title: "Error",
        description: "Failed to update stage",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteStage = async (stageId: string): Promise<boolean> => {
    try {
      await apiRequest(`/api/bounty-stages/${stageId}`, {
        method: "DELETE",
      });

      toast({
        title: "Success",
        description: "Stage deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/bounty-stages"] });
      return true;
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete stage",
        variant: "destructive",
      });
      return false;
    }
  };

  const reorderStages = async (
    _reorderedStages: BountyStage[]
  ): Promise<boolean> => {
    // TODO: Implement batch update endpoint
    toast({
      title: "Not Implemented",
      description: "Reorder stages functionality not yet implemented",
      variant: "destructive",
    });
    return false;
  };

  const getBountyPercentage = (stageId: string): number => {
    const stage = stages.find((s) => s.stageId === stageId);
    return stage?.percentage || 0;
  };

  const getTotalPercentage = (stagesList?: BountyStage[]): number => {
    const stagesToUse = stagesList || stages;
    return stagesToUse.reduce((total, stage) => total + stage.percentage, 0);
  };

  return {
    stages,
    loading,
    error,
    updateStagePercentage,
    resetToDefaults,
    saveAllStages,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    getBountyPercentage,
    getTotalPercentage,
    refetch,
  };
}
