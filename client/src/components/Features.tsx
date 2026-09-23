import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Features = () => {
  const features = [
    {
      icon: "🎯",
      title: "Smart Prospect Discovery",
      description:
        "Find perfect matches in our trusted network with hidden connections you never knew existed.",
      benefits: [
        "Intelligent prospect identification",
        "Hidden connection discovery",
        "Real-time network analysis",
      ],
    },
    {
      icon: "🤖",
      title: "Automated Introductions",
      description:
        "Handles timing, messaging, and follow-ups for seamless warm introductions at scale.",
      benefits: [
        "Personalized introduction requests",
        "Optimal timing optimization",
        "Automated relationship nurturing",
      ],
    },
    {
      icon: "📈",
      title: "Network Intelligence",
      description:
        "Learns from successful introductions to continuously improve matches and maximize ROI.",
      benefits: [
        "Success pattern recognition",
        "Predictive introduction success",
        "ROI optimization",
      ],
    },
  ];

  return (
    <section
      id="features"
      className="py-12 bg-gradient-to-br from-purple-50/30 via-background to-blue-50/30 dark:from-purple-950/10 dark:via-background dark:to-blue-950/10"
    >
      {/* Enhanced background with purple gradient */}
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge
            variant="secondary"
            className="mb-4 bg-purple-100 text-purple-800 hover:bg-purple-800 hover:text-purple-100 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-300 dark:hover:text-purple-900 dark:border-purple-800"
          >
            Intelligent Features
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
              AI-Powered Warm Introduction Engine
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Prospectly AI analyzes your network and finds perfect introduction
            matches with unprecedented accuracy.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="relative overflow-hidden border-2 border-purple-100/50 dark:border-purple-900/30 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-blue-50/20 dark:from-purple-950/20 dark:to-blue-950/10"></div>
              <CardContent className="relative p-6">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>

                <div className="space-y-2 flex flex-col items-center md:items-start">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div
                      key={benefitIndex}
                      className="flex items-center gap-2 text-sm text-muted-foreground w-full justify-center md:justify-start"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></div>
                      <span className="text-center md:text-left">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
