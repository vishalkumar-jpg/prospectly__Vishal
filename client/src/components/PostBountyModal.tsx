import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";

interface PostBountyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostBountyModal({ open, onOpenChange }: PostBountyModalProps) {
  const { toast } = useToast();
  const [bountyAmount, setBountyAmount] = useState("");

  const handleSubmit = () => {
    toast({
      title: "Referral Payout Posted",
      description:
        "Your referral payout has been posted. Connectors will start making introductions soon.",
    });
    onOpenChange(false);
    setBountyAmount("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setBountyAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2 pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle>
                Post a Referral Payout for Warm Introductions
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Add prospects you want to meet and set a referral payout.
                Connectors in the network will make warm introductions for you.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                1
              </div>
              <h3 className="text-base font-semibold">
                Set Your Referral Payout
              </h3>
            </div>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Total Referral Payout per Introduction
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="500"
                        value={bountyAmount}
                        onChange={(e) => setBountyAmount(e.target.value)}
                        className="pl-10 h-11 text-lg font-bold bg-white dark:bg-gray-950 border-2"
                        min="0"
                        data-testid="input-bounty-amount"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Recommended: $300-$1,000 for decision-makers at
                      mid-to-large companies
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Quick Presets:
                    </p>
                    <div className="flex gap-2">
                      {[250, 500, 750, 1000].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => setBountyAmount(amount.toString())}
                          className="flex-1"
                          data-testid={`button-preset-${amount}`}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                2
              </div>
              <h3 className="text-base font-semibold">Add Contact Details</h3>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g., Sarah Johnson"
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g., VP of Sales"
                      data-testid="input-contact-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Company <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g., Acme Corp"
                      data-testid="input-contact-company"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">LinkedIn URL</label>
                    <Input
                      placeholder="https://linkedin.com/in/..."
                      data-testid="input-contact-linkedin"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">
                      Why do you want to meet? (helps connectors)
                    </label>
                    <Input
                      placeholder="e.g., Discussing partnership opportunities"
                      data-testid="input-contact-reason"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-end pt-4 border-t">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-bounty"
              >
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                onClick={handleSubmit}
                data-testid="button-submit-bounty"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Post Referral Payout
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
