import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Shield } from "lucide-react";

const BottomCTA = () => {
  return (
    <section className="py-12">
      <div className="container mx-auto px-6">
        <div className="hero-gradient rounded-3xl p-8 text-center shadow-hero">
          <Badge
            variant="secondary"
            className="mb-4 bg-white/10 text-white border-white/20 text-sm"
          >
            Ready to Transform Your Network?
          </Badge>

          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            Stop Cold Calling. Start Warm Connecting.
          </h2>

          <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
            Join 25,000+ professionals who've transformed their sales pipeline
            with AI-powered warm introductions.
          </p>

          {/* Stats */}
          <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">85%</div>
              <div className="text-white/70 text-xs">Meeting Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">25K+</div>
              <div className="text-white/70 text-xs">Active Members</div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Upgrade for premium features</span>
            </div>
            <div className="w-1 h-1 bg-white/50 rounded-full"></div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BottomCTA;
