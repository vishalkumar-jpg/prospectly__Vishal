import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Shield,
  CheckCircle,
  Wallet,
  ArrowRight,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DealAlreadyClaimedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DealAlreadyClaimedModal = ({
  open,
  onOpenChange,
}: DealAlreadyClaimedModalProps) => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    onOpenChange(false);
    navigate("/signin");
  };

  const handleBrowseMarketplace = () => {
    onOpenChange(false);
    const returnUrl = encodeURIComponent("/prospecting/opportunities");
    navigate(`/signin?returnTo=${returnUrl}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
            <AlertCircle className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl font-extrabold tracking-tight">
            This Intro Has Been Claimed
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            This introduction opportunity has already been claimed by another
            connector. There are many more verified opportunities waiting for
            you.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 flex items-center gap-3 rounded-xl border border-brand-amethyst/15 bg-brand-amethyst/5 p-4">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-brand-cta">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-extrabold leading-tight">
              Join thousands of professionals
            </p>
            <p className="text-[12.5px] leading-snug text-muted-foreground">
              Monetize your network through verified introductions. New
              opportunities are added daily.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Button
            size="lg"
            onClick={handleSignIn}
            className="w-full gap-2 bg-brand-gradient text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
          >
            Sign in to Explore Opportunities
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={handleBrowseMarketplace}
          >
            Browse Marketplace
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-brand-success" />
            Secure
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-brand-success" />
            Verified
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-brand-success" />
            Fast Payouts
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
