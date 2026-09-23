import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

interface RepublishRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  connectorName?: string | null;
  onSuccess?: () => void;
}

export function RepublishRequestDialog({
  isOpen,
  onClose,
  requestId,
  connectorName,
  onSuccess,
}: RepublishRequestDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const excludedConnectorLabel = connectorName?.trim() || "The connector";

  const republishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/introduction-requests/${requestId}/republish`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      toast({
        title: "Request re-published",
        description:
          "Payment has been re-authorized and eligible connectors have been notified.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/requester/introduction-requests/pipeline"],
      });
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to re-publish",
        description: error.message || "Failed to re-publish this request.",
        variant: "destructive",
      });
    },
  });

  const isSubmitting = republishMutation.isPending;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Re-publish introduction request?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Are you sure you want to re-publish this request? Your payment
              will be re-authorized for the next introduction attempt.
            </span>
            <span className="block text-foreground font-medium">
              {excludedConnectorLabel} will not be able to see or accept this
              request again.
            </span>
            <span className="block">
              Other eligible connectors will be notified once you confirm.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (isSubmitting) return;
              republishMutation.mutate();
            }}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? "Re-publishing..." : "Yes, re-publish"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
