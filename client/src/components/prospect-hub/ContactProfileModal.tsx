import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { ContactDetailsData } from "./ContactProfilePage";
import { ContactProfilePage } from "./ContactProfilePage";
import { IntroductionForm } from "@/components/introduction/IntroductionForm";

interface ContactProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: {
    id?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    company?: string;
    bounty_amount?: string | number;
    bountyAmount?: string | number;
    user_id?: string;
    quality_score?: number;
    profile_photo_url?: string | null;
    source?: "contacts" | "apollo";
    enrichmentStatus?: string | null;
    linkedin?: string | null;
    hasEmail: boolean;
  } | null;
  defaultBountyAmount: number;
  onDialogReady?: () => void;
  onBountyCalculated?: (contactId: string, amount: number) => void;
  onProspectEnriched?: (
    originalId: string,
    enrichedId: string,
    details: ContactDetailsData
  ) => void;
}

export function ContactProfileModal({
  isOpen,
  onClose,
  contact,
  defaultBountyAmount,
  onDialogReady,
  onBountyCalculated,
  onProspectEnriched,
}: ContactProfileModalProps) {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState<"profile" | "introduction">(
    "profile"
  );
  const [bountyAmount, setBountyAmount] = useState("0");
  const [isBountyCalculating, setIsBountyCalculating] = useState(false);
  const [bountyCalculated, setBountyCalculated] = useState(false);
  const [contactDetails, setContactDetails] =
    useState<ContactDetailsData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [enrichedContactId, setEnrichedContactId] = useState<string | null>(
    null
  );
  const [isCheckingOwnership, setIsCheckingOwnership] = useState(false);
  const [showOwnContactAlert, setShowOwnContactAlert] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const navigateTo = useCallback((page: "profile" | "introduction") => {
    setCurrentPage(page);
    scrollRef.current?.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPage("profile");
    setBountyAmount(defaultBountyAmount.toString());
    setIsBountyCalculating(false);
    setBountyCalculated(false);
    setContactDetails(null);
    setIsLoadingDetails(true);
    setEnrichedContactId(null);
    setIsCheckingOwnership(false);
    setShowOwnContactAlert(false);
    onDialogReady?.();
    // defaultBountyAmount is read on open only; omitting it from deps avoids wiping
    // contactDetails when the parent updates bounty after calculate completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [isOpen]);

  useEffect(() => {
    if (!contact?.id || !isOpen) return;

    const originalId = String(contact.id);

    const fetchDetails = async (cId: string) => {
      try {
        const details = await api.contacts.getContactDetails(cId);
        setContactDetails(details);
        onProspectEnriched?.(originalId, cId, details);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unable to load contact details. Please try again.",
        });
      } finally {
        setIsLoadingDetails(false);
      }
    };

    const calcBounty = async (cId: string) => {
      try {
        const result = await api.contacts.calculateBounty({ id: cId });
        if (result?.success && result.bountyAmount != null) {
          setBountyAmount(result.bountyAmount.toString());
          onBountyCalculated?.(cId, result.bountyAmount);
        }
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unable to calculate referral payout. Please try again.",
        });
      }
    };

    if (
      contact.enrichmentStatus === "completed" &&
      Boolean(contact.hasEmail) === true
    ) {
      const currentBounty = Number(
        contact.bounty_amount || contact.bountyAmount || 0
      );
      if (currentBounty > 0) setBountyCalculated(true);
      else {
        setIsBountyCalculating(true);
        calcBounty(String(contact.id)).finally(() => {
          setIsBountyCalculating(false);
          setBountyCalculated(true);
        });
      }
      setEnrichedContactId(String(contact.id));
      fetchDetails(String(contact.id));
      return;
    }

    setIsBountyCalculating(true);
    (async () => {
      try {
        const enrichResult = await api.contacts.enrichContact({
          id: originalId,
          source: contact.source || "contacts",
          linkedin_url: contact.linkedin || undefined,
        });
        const cId = String(enrichResult.id);
        setEnrichedContactId(cId);
        const enrichedBounty = parseFloat(enrichResult.bountyAmount || "0");
        if (enrichedBounty > 0) {
          setBountyAmount(enrichedBounty.toString());
          onBountyCalculated?.(cId, enrichedBounty);
        } else {
          await calcBounty(cId);
        }
        await fetchDetails(cId);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unable to load contact details. Please try again.",
        });
        setIsLoadingDetails(false);
      } finally {
        setIsBountyCalculating(false);
        setBountyCalculated(true);
      }
    })();
  }, [contact?.id, isOpen, onBountyCalculated, onProspectEnriched, toast]);

  if (!contact) return null;

  const contactName = contactDetails
    ? [contactDetails.firstName, contactDetails.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown"
    : [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
      "Unknown";

  const enrichedContact = contactDetails
    ? {
        ...contact,
        ...(enrichedContactId ? { id: Number(enrichedContactId) } : {}),
        first_name: contactDetails.firstName || contact.first_name,
        last_name: contactDetails.lastName || contact.last_name,
        title: contactDetails.title || contact.title,
        company: contactDetails.company || contact.company,
        profile_photo_url:
          contactDetails.profilePhotoUrl || contact.profile_photo_url,
      }
    : contact;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] p-0 gap-0 overflow-hidden bg-app flex flex-col [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">
          {currentPage === "profile"
            ? contactName
            : "Send Introduction Request"}
        </DialogTitle>

        {/* Sticky Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white sticky top-0 z-10">
          {currentPage === "profile" ? (
            <>
              <div className="w-[70px]" />
              <span className="text-sm font-semibold truncate">
                {contactName}
              </span>
              <DialogClose className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                <span className="sr-only">Close</span>
              </DialogClose>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTo("profile")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <span className="text-sm font-semibold truncate">
                Send Introduction Request
              </span>
              <DialogClose className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                <span className="sr-only">Close</span>
              </DialogClose>
            </>
          )}
        </div>

        {/* Page Content */}
        <div
          ref={scrollRef}
          className="overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {currentPage === "profile" ? (
            <ContactProfilePage
              contactDetails={contactDetails}
              isLoading={isLoadingDetails}
              bountyAmount={bountyAmount}
              isBountyCalculating={isBountyCalculating}
              isCheckingOwnership={isCheckingOwnership}
              onRequestIntroduction={async () => {
                const cId = enrichedContactId || String(contact.id);
                if (!cId) return;
                setIsCheckingOwnership(true);
                try {
                  const result =
                    await api.introductions.checkContactOwnership(cId);
                  if (result.isOwned) {
                    setShowOwnContactAlert(true);
                  } else {
                    navigateTo("introduction");
                  }
                } catch {
                  // Fail-open: backend guard is the safety net
                  navigateTo("introduction");
                } finally {
                  setIsCheckingOwnership(false);
                }
              }}
            />
          ) : (
            <IntroductionForm
              contact={enrichedContact}
              defaultBountyAmount={Number(bountyAmount) || defaultBountyAmount}
              connectorCount={contactDetails?.connectorCount ?? 0}
              onClose={onClose}
            />
          )}
        </div>
      </DialogContent>

      <AlertDialog
        open={showOwnContactAlert}
        onOpenChange={setShowOwnContactAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitleComponent>
              Unable to Request Introduction
            </AlertDialogTitleComponent>
            <AlertDialogDescription>
              You cannot request an introduction to your own contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowOwnContactAlert(false)}>
              Go Back
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
