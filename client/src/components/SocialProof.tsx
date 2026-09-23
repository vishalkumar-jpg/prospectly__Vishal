import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Star,
  TrendingUp,
  Users,
  Building2,
  Quote,
  CheckCircle,
  Target,
  UserCheck,
  Megaphone,
  Crown,
  Lightbulb,
} from "lucide-react";

const SocialProof = () => {
  const successStories = [
    {
      name: "Marcus Rodriguez",
      role: "VP of Sales",
      company: "TechFlow Solutions",
      initials: "MR",
      dealValue: "Connected with 8 VPs",
      quote:
        "Through Prospectly's warm introductions, I connected with decision-makers who were actually interested in talking. Made 15 quality connections in 6 weeks.",
    },
    {
      name: "David Kim",
      role: "Founder & CEO",
      company: "DataSync Pro",
      initials: "DK",
      dealValue: "12 warm VC intros",
      quote:
        "Getting warm introductions to the right VCs was game-changing. Instead of fighting for attention, investors were actually excited to meet with us.",
    },
  ];

  const keyMetrics = [
    { number: "5.2x", label: "Higher Response Rate" },
    { number: "25,000+", label: "Verified Professionals" },
    { number: "50,000+", label: "Successful Introductions" },
  ];

  return (
    <section className="pt-12 pb-6 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Header with Key Metric */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              Proven Results
            </Badge>
          </div>
          <div className="text-4xl font-bold text-primary mb-4">
            10x Higher Closing Rate
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our members are closing more deals through warm introductions
            instead of cold outreach.
          </p>
        </div>

        {/* Success Stories Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
          {successStories.map((story, index) => (
            <Card
              key={index}
              className="bg-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-8">
                {/* Quote */}
                <blockquote className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  "{story.quote}"
                </blockquote>

                {/* Profile and Deal Value */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {story.initials}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="font-semibold text-foreground">
                        {story.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {story.role}
                      </div>
                      <div className="text-sm font-medium text-primary">
                        {story.company}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xl font-bold text-emerald-600">
                      {story.dealValue}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trusted by Professional Groups */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              Trusted by 25,000+ Prospectly Members
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-6xl mx-auto justify-items-center">
            {/* All items in one row */}
            <div className="bg-card/50 rounded-lg p-4 border border-border/50 text-center w-full">
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-semibold text-foreground text-sm leading-tight">
                  Sales Teams
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                (Vistage, EO, Sales Leadership Alliance)
              </p>
            </div>

            <div className="bg-card/50 rounded-lg p-4 border border-border/50 text-center w-full">
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-semibold text-foreground text-sm leading-tight">
                  Recruiters
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                (NAPS, SHRM, global staffing groups)
              </p>
            </div>

            <div className="bg-card/50 rounded-lg p-4 border border-border/50 text-center w-full">
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-semibold text-foreground text-sm leading-tight">
                  Agencies
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                (AMA, 4A's, Digital Agency Network)
              </p>
            </div>

            <div className="bg-card/50 rounded-lg p-4 border border-border/50 text-center w-full">
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-semibold text-foreground text-sm leading-tight">
                  Business Owners
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                (BNI, Vistage, YPO, EO)
              </p>
            </div>

            <div className="bg-card/50 rounded-lg p-4 border border-border/50 text-center w-full">
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="font-semibold text-foreground text-sm leading-tight">
                  Consultants, Coaches & Connectors
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                (ICF, Vistage Chairs, Forbes Coaches Council)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
