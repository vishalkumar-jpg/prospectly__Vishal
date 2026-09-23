import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Star, Target, ChevronDown } from "lucide-react";

const MarketplaceTips = () => {
  const [showTips, setShowTips] = useState(true);

  // Load tips visibility from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("marketplace-tips-visible");
    if (stored !== null) {
      setShowTips(JSON.parse(stored));
    }
  }, []);

  // Save tips visibility to localStorage when it changes
  const toggleTips = (visible: boolean) => {
    setShowTips(visible);
    localStorage.setItem("marketplace-tips-visible", JSON.stringify(visible));
  };

  // Collapsed state - show expand button
  if (!showTips) {
    return (
      <div className="mx-6 pt-6">
        <Button
          onClick={() => toggleTips(true)}
          variant="outline"
          className="w-full py-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-950/50 dark:hover:to-indigo-950/50 transition-all duration-300"
        >
          <ChevronDown className="h-5 w-5 mr-2 text-blue-600" />
          <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">
            Show Introduction Tips & Stats
          </span>
        </Button>
      </div>
    );
  }

  const content = {
    badge: "Discover High-Value Opportunities",
    title: "Discover Paid Introduction Opportunities",
    subtitle:
      "Browse verified introduction requests from requesters—matched to your network",
    stats: [
      // {
      //   value: "92%",
      //   label: "Escrow Funded",
      //   desc: "all referral payouts secured",
      // },
      // {
      //   value: "$650",
      //   label: "Avg Referral Payout Value",
      //   desc: "per completed intro",
      // },
      // { value: "3.2x", label: "Better Match Rate", desc: "vs. cold searching" },
      // {
      //   value: "24h",
      //   label: "New Requests Daily",
      //   desc: "fresh opportunities",
      // },
    ],
    testimonials: [],
  };

  return (
    <div className="mx-6 pt-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-2xl border border-white/20">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-purple-600/20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl"></div>

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                <Target className="h-9 w-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {content.title}
                </h1>
                <p className="text-white/90 text-base mt-1 max-w-md">
                  {content.subtitle}
                </p>
              </div>
            </div>

            {/* Quick Stats in Header */}
            {content.stats.length > 0 && (
              <div className="flex flex-wrap gap-4 lg:gap-6">
                {content.stats.map((stat, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-white/90 text-sm">{stat.label}</p>
                        <p className="text-white font-bold text-xl">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 h-auto px-3 py-1 hover:bg-white/20 text-white/80 hover:text-white z-10 text-sm"
            onClick={() => toggleTips(false)}
          >
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        </div>
      </div>

      {/* Enhanced Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {content.testimonials.map((testimonial, index) => (
          <Card
            key={index}
            className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-base text-foreground font-medium leading-relaxed">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {testimonial.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-blue-700 dark:text-blue-300">
                      {testimonial.author}
                    </div>
                    <div className="text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceTips;
