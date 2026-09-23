import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Star, X, ChevronDown } from "lucide-react";

interface SeekIntroductionsTipsProps {
  type: "search" | "pipeline";
}

const SeekIntroductionsTips = ({ type }: SeekIntroductionsTipsProps) => {
  const [showTips, setShowTips] = useState(true);

  // Load tips visibility from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("seek-introductions-tips-visible");
    if (stored !== null) {
      setShowTips(JSON.parse(stored));
    }
  }, []);

  // Save tips visibility to localStorage when it changes
  const toggleTips = (visible: boolean) => {
    setShowTips(visible);
    localStorage.setItem(
      "seek-introductions-tips-visible",
      JSON.stringify(visible)
    );
  };

  // Collapsed state - show expand button
  if (!showTips) {
    return (
      <div className="mb-6">
        <Button
          onClick={() => toggleTips(true)}
          variant="outline"
          className="w-full py-6 border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-950/50 dark:hover:to-emerald-950/50 transition-all duration-300"
        >
          <ChevronDown className="h-5 w-5 mr-2 text-green-500" />
          <span className="text-lg font-semibold text-green-700 dark:text-green-300">
            Show Introduction Tips & Stats
          </span>
        </Button>
      </div>
    );
  }

  const searchContent = {
    badge: "Find Your Next Connection",
    title: "Search & Request Warm Introductions",
    subtitle:
      "Discover decision-makers in your network and request warm introductions",
    stats: [
      // { value: "5.8x", label: "Higher Response", desc: "vs. cold outreach" },
      // { value: "73%", label: "Meeting Success", desc: "warm intro rate" },
      // { value: "2.3 days", label: "Avg Response", desc: "introduction time" },
      // { value: "$150K", label: "Avg Deal Value", desc: "through intros" },
    ],
    testimonials: [
      // {
      //   text: "I closed $300K in deals within 4 months using warm introductions. The quality is incomparable to cold leads.",
      //   author: "David Park",
      //   role: "Founder • $1.2M revenue attributed",
      // },
      // {
      //   text: "The search feature helped me find 15 target prospects I already had connections to. Saved months of cold outreach.",
      //   author: "Sarah Johnson",
      //   role: "VP Business Development",
      // },
    ],
  };

  const pipelineContent = {
    badge: "Track Your Success",
    title: "Manage Your Introduction Requests",
    subtitle:
      "Track and optimize your warm introduction pipeline for maximum success",
    stats: [
      // { value: "85%", label: "Success Rate", desc: "tracked vs untracked" },
      // { value: "$125K", label: "Avg Pipeline Value", desc: "per active user" },
      // { value: "3.2x", label: "Faster Close", desc: "with tracking" },
      // { value: "12", label: "Avg Active Intros", desc: "top performers" },
    ],
    testimonials: [
      // {
      //   text: "The pipeline view helped me manage 15 simultaneous introduction requests. My conversion went from 15% to 68%.",
      //   author: "Michael Torres",
      //   role: "Sales Director • Top 5% closer",
      // },
      // {
      //   text: "Being able to see status updates in real-time made all the difference. I know exactly when to follow up.",
      //   author: "Jennifer Lee",
      //   role: "Business Owner • $500K closed",
      // },
    ],
  };

  const content = type === "search" ? searchContent : pipelineContent;

  return (
    <div className="mb-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 shadow-2xl border border-white/20">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-transparent to-emerald-500/20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl"></div>

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
            className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 shadow-lg hover:shadow-xl transition-all duration-300"
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                    {testimonial.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-green-700 dark:text-green-300">
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

export default SeekIntroductionsTips;
