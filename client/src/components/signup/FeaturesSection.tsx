import { UserPlus, DollarSign, Network } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: UserPlus,
    title: "Make Warm Introductions",
    description:
      "Connect people in your network with opportunities they'll genuinely love. No spam, just real value.",
  },
  {
    icon: DollarSign,
    title: "Earn for Every Introduction",
    description:
      "Get paid when your introductions lead to successful deals. Build income from your existing relationships.",
  },
  {
    icon: Network,
    title: "Grow Your Influence",
    description:
      "Strengthen your network by adding value. Become the connector everyone wants to know.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-16 md:py-28 bg-background border-t border-border">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Join Prospectly?
          </h2>
          <p className="text-lg text-muted-foreground">
            We're building the future of business relationships. Start earning
            today by doing what you do best—connecting great people.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-8 border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group"
              >
                {/* Icon */}
                <div className="mb-6 inline-flex">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-purple-600/10 group-hover:from-primary/20 group-hover:to-purple-600/20 transition-all duration-300">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
