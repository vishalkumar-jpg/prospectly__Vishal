import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useBountyStages } from "@/hooks/useBountyStages";
import { UnfulfilledCard } from "./UnfulfilledCard";
import { FailureModal } from "./FailureModal";
import { Loader } from "@/components/ui/loader";
import { toUTC } from "@/lib/dayjs";
import {
  UnfulfilledRequest,
  ActiveIntroduction,
  FAILURE_REASON_LABELS,
} from "./UnfulfilledTab.types";

interface UnfulfilledTabProps {
  search?: string;
}

export function UnfulfilledTab({ search = "" }: UnfulfilledTabProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedIntroduction, setSelectedIntroduction] =
    useState<ActiveIntroduction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFailureInfo, setSelectedFailureInfo] = useState<{
    failureStage: string;
    failureReason: string;
  } | null>(null);

  const searchParam = search.trim() || undefined;

  const { data: unfulfilled, isPending } = useQuery<UnfulfilledRequest[]>({
    queryKey: [
      "/api/introduction-requests/connector/unfulfilled",
      { search: searchParam },
    ],
    refetchOnWindowFocus: false,
  });

  const { stages: dbStages } = useBountyStages();

  const openDetailsModal = (item: UnfulfilledRequest, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const relativeTime = formatDistanceToNow(toUTC(item.createdAt), {
      addSuffix: true,
    });

    const mappedIntroduction: ActiveIntroduction = {
      id: item.introductionRequestId,
      requesterName:
        item.requesterName === "Unknown" || !item.requesterName
          ? "User's Account deleted"
          : item.requesterName || "Unknown",
      requesterCompany: item.requesterCompany || "Unknown Company",
      requesterPhotoUrl: item.requesterPhotoUrl,
      targetName:
        item.targetName === "Unknown" || !item.targetName
          ? "User's Account deleted"
          : item.targetName || "Unknown",
      targetCompany: item.targetCompany || "Unknown Company",
      targetPhotoUrl: item.targetPhotoUrl,
      bountyAmount: item.bountyAmount || 0,
      stage: (item.failureStage as ActiveIntroduction["stage"]) || "intro_sent",
      lastActivity: `Marked unfulfilled ${relativeTime}`,
      lastActivityTimestamp: item.createdAt,
      nextAction:
        FAILURE_REASON_LABELS[item.failureReason] || item.failureReason,
      progress: 0,
      meetingTitle: item.meetingTitle,
      meetingDescription: item.meetingDescription,
      additionalContext: item.failureNotes,
    };

    setSelectedIntroduction(mappedIntroduction);
    setSelectedFailureInfo({
      failureStage: item.failureStage,
      failureReason:
        FAILURE_REASON_LABELS[item.failureReason] || item.failureReason,
    });
    setIsModalOpen(true);
  };

  const getStageInfo = () => {
    const stageData = dbStages.find(
      (s) => s.stageId === selectedIntroduction?.stage
    );
    return {
      title: stageData?.title || "Unfulfilled",
      color:
        "bg-red-50 text-red-600 hover:bg-red-600 hover:text-red-50 border-red-200",
      percentage: 0,
    };
  };

  if (isPending) {
    return <Loader message="Loading unfulfilled requests..." />;
  }

  if (!unfulfilled || unfulfilled.length === 0) {
    return (
      <Card className="rounded-2xl border border-border bg-card shadow-brand-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No Unfulfilled Requests
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            You haven't marked any introduction requests as unfulfilled. When
            you cannot complete an introduction, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">Unfulfilled Introductions</h2>
        <Badge variant="secondary">{unfulfilled.length}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {unfulfilled.map((item) => (
          <UnfulfilledCard
            key={item.id}
            item={item}
            expandedCards={expandedCards}
            setExpandedCards={setExpandedCards}
            onOpenDetails={openDetailsModal}
          />
        ))}
      </div>

      <FailureModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedIntroduction(null);
          setSelectedFailureInfo(null);
        }}
        introduction={selectedIntroduction}
        failureInfo={selectedFailureInfo}
        getStageInfo={getStageInfo}
      />
    </div>
  );
}
