import { Gavel, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DisputeActionBannerProps {
  onFileDispute: () => void;
}

export function DisputeActionBanner({
  onFileDispute,
}: DisputeActionBannerProps) {
  return (
    <Card className="bg-card text-card-foreground border border-border rounded-lg shadow-sm overflow-hidden">
      <CardContent className="!p-4 md:!p-6 bg-gradient-to-r from-brand-amethyst/10 via-brand-amethyst/5 to-background">
        <div className="flex flex-col md:flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Icon and Text Group */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            {/* Icon */}
            <div className="flex justify-center md:justify-start lg:justify-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-brand-amethyst/20 bg-brand-amethyst/15">
                <Gavel className="h-7 w-7 text-brand-amethyst" />
              </div>
            </div>

            {/* Header and Description */}
            <div className="text-center md:text-left lg:text-left">
              <h3 className="text-xl font-bold mb-2">
                Have an issue with an introduction?
              </h3>
              <p className="text-muted-foreground max-w-xl mx-auto md:mx-0 lg:mx-0">
                If a meeting didn't happen as expected or you encountered other
                issues, you can file a dispute. Our team will review it and help
                resolve the situation.
              </p>
            </div>
          </div>

          {/* Button */}
          <div className="flex justify-center md:justify-center lg:justify-end mt-4 md:mt-4 lg:mt-0">
            <Button
              onClick={onFileDispute}
              size="lg"
              className="gap-2 px-6 font-semibold md:px-8 bg-brand-gradient text-brand-foreground shadow-brand-cta transition-all hover:shadow-brand-cta-lg"
            >
              <Plus className="h-5 w-5" />
              File a New Dispute
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
