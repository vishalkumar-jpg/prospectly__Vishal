import { useNavigate } from "react-router-dom";
import {
  Heart,
  DollarSign,
  Star,
  TrendingUp,
  Eye,
  ArrowRight,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function IntroActionsPanel() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Main Action Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            {/* Icon */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg flex items-center justify-center">
              <Heart className="h-7 w-7 text-primary-foreground" />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                Give Your First Introduction
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start by helping someone else make a valuable connection. This
                unlocks full access to the network and builds your reputation as
                a trusted connector.
              </p>

              {/* Benefits Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs font-medium text-green-900 dark:text-green-100">
                      Earn Credits
                    </p>
                    <p className="text-[10px] text-green-700 dark:text-green-300">
                      Build network value
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Star className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      Build Trust
                    </p>
                    <p className="text-[10px] text-blue-700 dark:text-blue-300">
                      Increase reputation
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gs-amethyst/25 bg-gs-amethyst/10">
                  <TrendingUp className="h-5 w-5 text-gs-amethyst" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Unlock Features
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Access full platform
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                  <Heart className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-xs font-medium text-orange-900 dark:text-orange-100">
                      Help Others
                    </p>
                    <p className="text-[10px] text-orange-700 dark:text-orange-300">
                      Make connections
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate("/prospecting/incoming-requests")}
                  className="flex-1 min-w-[200px]"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Browse Opportunities
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alternative Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          className="border cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => navigate("/prospecting/opportunities")}
          role="button"
          tabIndex={0}
          aria-label="View all opportunities"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/prospecting/opportunities");
            }
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">Global Marketplace</p>
                <p className="text-xs text-muted-foreground">
                  View all opportunities
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => navigate("/dashboard")}
          role="button"
          tabIndex={0}
          aria-label="Go to Dashboard"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/dashboard");
            }
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-sm">Go to Dashboard</p>
                <p className="text-xs text-muted-foreground">Skip for now</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h5 className="font-semibold text-sm mb-1">
                How Introductions Work
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When you give an introduction, you're connecting two people from
                your network. You'll earn credits and build your trust score
                with each successful introduction. The more quality
                introductions you make, the more opportunities you'll unlock.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
