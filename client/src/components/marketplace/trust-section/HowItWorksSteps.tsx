import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HowItWorksStep } from "./types";

interface HowItWorksStepsProps {
  steps: HowItWorksStep[];
}

export function HowItWorksSteps({ steps }: HowItWorksStepsProps) {
  return (
    <div className="mb-12">
      <h2 className="text-xl font-semibold text-center mb-8">
        How Prospectly Works
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step, index) => (
          <div key={step.number} className="relative">
            <Card className="h-full bg-white/80 dark:bg-slate-800/80 backdrop-blur hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div
                  className={cn(
                    "w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center",
                    step.color
                  )}
                >
                  <step.icon className="h-7 w-7 text-white" />
                </div>
                <Badge variant="outline" className="mb-3">
                  Step {step.number}
                </Badge>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>

            {/* Arrow connector */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                <ArrowRight className="h-6 w-6 text-primary/50" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
