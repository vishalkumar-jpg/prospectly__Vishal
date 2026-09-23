import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Globe, Loader2, Users } from "lucide-react";

interface MoveToMarketplaceDialogBaseProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MoveToMarketplaceWithRequestProps extends MoveToMarketplaceDialogBaseProps {
  requestId: string;
  onSuccess?: () => void;
  onConfirm?: never;
  isSubmitting?: never;
  confirmButtonLabel?: never;
}

interface MoveToMarketplaceConfirmationOnlyProps extends MoveToMarketplaceDialogBaseProps {
  requestId?: never;
  onSuccess?: never;
  onConfirm: () => void;
  isSubmitting?: boolean;
  confirmButtonLabel?: string;
}

type MoveToMarketplaceDialogProps =
  | MoveToMarketplaceWithRequestProps
  | MoveToMarketplaceConfirmationOnlyProps;

function isConfirmationOnlyMode(
  props: MoveToMarketplaceDialogProps
): props is MoveToMarketplaceConfirmationOnlyProps {
  return "onConfirm" in props && props.onConfirm !== undefined;
}

function MarketplaceVisibilityConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  confirmButtonLabel = "I Understand, Send Request",
}: MoveToMarketplaceConfirmationOnlyProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Marketplace Visibility</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Your introduction request will be publicly visible on the
              marketplace. Connectors will be able to see:
            </span>
            <span className="block text-foreground font-medium">
              &bull; The prospect&apos;s name and company
            </span>
            <span className="block text-foreground font-medium">
              &bull; Your meeting details and referral payout amount
            </span>
            <span className="block text-foreground font-medium">
              &bull; Any additional context you provided
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go Back</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (isSubmitting) return;
              onClose();
              onConfirm();
            }}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? "Sending..." : confirmButtonLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface MoveToMarketplaceWithMutationProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  onSuccess?: () => void;
}

function MoveToMarketplaceWithMutation({
  isOpen,
  onClose,
  requestId,
  onSuccess,
}: MoveToMarketplaceWithMutationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const moveToMarketplaceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        `/introduction-requests/${requestId}/move-to-marketplace`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Moved to Global Marketplace",
        description:
          "Your introduction request is now visible to all connectors in the marketplace.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/requester/introduction-requests/pipeline"],
      });
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to move request to marketplace.",
        variant: "destructive",
      });
    },
  });

  const handleMoveToMarketplace = () => {
    moveToMarketplaceMutation.mutate();
  };

  const isSubmitting = moveToMarketplaceMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Move to Global Marketplace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              What is the Global Marketplace?
            </h4>
            <p className="text-sm text-blue-800 leading-relaxed">
              The Global Marketplace allows your introduction request to be seen
              by all connectors on the platform who have relationships with your
              target contact. This significantly increases your chances of
              getting connected, as any connector with a matching network can
              help facilitate the introduction.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleMoveToMarketplace}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Move to Marketplace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MoveToMarketplaceDialog(props: MoveToMarketplaceDialogProps) {
  if (isConfirmationOnlyMode(props)) {
    return <MarketplaceVisibilityConfirmationDialog {...props} />;
  }
  return (
    <MoveToMarketplaceWithMutation
      isOpen={props.isOpen}
      onClose={props.onClose}
      requestId={props.requestId}
      onSuccess={props.onSuccess}
    />
  );
}
