import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function PricingSection() {
  return (
    <section className="py-16 md:py-28 bg-gradient-to-br from-primary/5 via-purple-600/5 to-background border-t border-border">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Free Badge */}
          <div className="inline-flex items-center gap-2 mb-8">
            <CheckCircle2 className="w-6 h-6 text-primary" />
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-sm py-1 px-3">
              Free to Join
            </Badge>
          </div>

          {/* Heading */}
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Earning Today
          </h2>

          {/* Subheading */}
          <p className="text-lg text-muted-foreground mb-8">
            No credit card required • No hidden fees • Cancel anytime
          </p>

          {/* CTA Link */}
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <span>View full pricing details</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
