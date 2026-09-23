import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Handshake,
  Heart,
  Users,
  TrendingUp,
  CheckCircle,
  Shield,
} from "lucide-react";

const CommunityPledge = () => {
  const pledgePoints = [
    {
      icon: Handshake,
      title: "Quality Introductions",
      description:
        "Make relevant, valuable connections that benefit all parties",
    },
    {
      icon: Users,
      title: "Trust & Respect",
      description:
        "Treat all community members with professionalism and integrity",
    },
    {
      icon: TrendingUp,
      title: "Growth Mindset",
      description:
        "Believe in the power of warm introductions to grow together",
    },
    {
      icon: Shield,
      title: "Your Contacts Stay Private",
      description:
        "We will never email or spam your contacts. They're only used to find matches for warm introductions.",
    },
  ];

  return (
    <section className="py-12 bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-green-50/20 dark:from-emerald-950/10 dark:to-green-950/5" />

      <div className="container mx-auto px-2 md:px-6 relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Badge
              variant="outline"
              className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 w-fit"
            >
              <Heart className="h-3 w-3 mr-2" />
              Community First
            </Badge>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Community Pledge
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Every member commits to building trust through quality
            introductions.
          </p>
        </div>

        {/* Pledge Points */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {pledgePoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <Card
                key={index}
                className="p-4 hover:shadow-lg transition-all duration-300 border border-emerald-100 dark:border-emerald-900/30 bg-card/50 backdrop-blur-sm"
              >
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 mx-auto mb-3">
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-base font-semibold mb-2 text-foreground">
                    {point.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {point.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CommunityPledge;
