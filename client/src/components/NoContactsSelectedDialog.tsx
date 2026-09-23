import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Zap, CheckCircle, ArrowRight } from "lucide-react";

interface NoContactsSelectedDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAll: () => void;
  onSelectBySource: (source: string) => void;
  contactCounts: {
    total: number;
    linkedin: number;
    google: number;
    apple: number;
    android: number;
  };
}

export function NoContactsSelectedDialog({
  isOpen,
  onOpenChange,
  onSelectAll,
  onSelectBySource,
  contactCounts,
}: NoContactsSelectedDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            Oops! No Contacts Selected
          </DialogTitle>
          <DialogDescription className="text-base">
            Select contacts to invite them to Prospectly and start earning
            credits! Pro tip: Use Quick Select options below for faster
            selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Earnings Info */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-green-800">
                  Earn 500 Credits
                </h4>
                <p className="text-sm text-green-600">per successful signup</p>
              </div>
            </div>
          </div>

          {/* Quick Selection Options */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Quick Selection Options
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectAll();
                  onOpenChange(false);
                }}
                className="justify-start text-left"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">All Active</div>
                  <div className="text-xs text-muted-foreground">
                    {contactCounts.total} contacts
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectBySource("LinkedIn");
                  onOpenChange(false);
                }}
                className="justify-start text-left"
                disabled={contactCounts.linkedin === 0}
              >
                <div className="w-4 h-4 mr-2 bg-blue-600 rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">in</span>
                </div>
                <div>
                  <div className="font-medium">LinkedIn</div>
                  <div className="text-xs text-muted-foreground">
                    {contactCounts.linkedin} contacts
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectBySource("Google");
                  onOpenChange(false);
                }}
                className="justify-start text-left"
                disabled={contactCounts.google === 0}
              >
                <div className="w-4 h-4 mr-2 bg-red-500 rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
                <div>
                  <div className="font-medium">Google</div>
                  <div className="text-xs text-muted-foreground">
                    {contactCounts.google} contacts
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectBySource("Apple");
                  onOpenChange(false);
                }}
                className="justify-start text-left"
                disabled={contactCounts.apple === 0}
              >
                <div className="w-4 h-4 mr-2 bg-gray-800 rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
                <div>
                  <div className="font-medium">Apple</div>
                  <div className="text-xs text-muted-foreground">
                    {contactCounts.apple} contacts
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* Action */}
          <div className="pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full gap-2"
            >
              Perfect! Let me choose contacts
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
