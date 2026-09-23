import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useRouteSearch } from "@/hooks/useRouteSearch";
import { DisputeStats } from "./DisputeStats";
import { DisputeActionBanner } from "./DisputeActionBanner";
import { DisputeFilters } from "./DisputeFilters";
import { DisputeTable } from "./DisputeTable";
import { CreateDisputeModal } from "./CreateDisputeModal";
import { DisputeDetailsModal } from "./DisputeDetailsModal";
import { useDisputes } from "@/hooks/useDisputes";
import { useDispute } from "@/hooks/useDispute";
import { Dispute } from "@/types/dispute";

export function DisputesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const disputeId = searchParams.get("disputeId");
  const { search, setSearch } = useRouteSearch();
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const { disputes, loading, refetchDisputes, pagination, setPage, setLimit } =
    useDisputes(undefined, search, status, priority);

  // Reset pagination to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, status, priority, setPage]);

  // Fetch specific dispute if ID is present in URL
  const { dispute: linkedDispute } = useDispute(disputeId || undefined);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  // Open dispute details when linked dispute is loaded
  useEffect(() => {
    if (linkedDispute && disputeId) {
      setSelectedDispute(linkedDispute);
      setIsDetailsOpen(true);
    }
  }, [linkedDispute, disputeId]);

  const handleViewDetails = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setIsDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setIsDetailsOpen(open);
    if (!open && disputeId) {
      // Clear disputeId from URL when closing modal
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("disputeId");
      setSearchParams(newParams);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DisputeActionBanner onFileDispute={() => setIsModalOpen(true)} />

      <div className="space-y-4">
        <DisputeFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          priority={priority}
          onPriorityChange={setPriority}
        />

        <DisputeTable
          disputes={disputes}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={setLimit}
          onViewDetails={handleViewDetails}
        />
      </div>

      <CreateDisputeModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={refetchDisputes}
      />

      <DisputeDetailsModal
        open={isDetailsOpen}
        onOpenChange={handleDetailsOpenChange}
        dispute={selectedDispute}
      />
    </div>
  );
}
