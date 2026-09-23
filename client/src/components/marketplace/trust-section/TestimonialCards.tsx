import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import type { Testimonial } from "./types";

interface TestimonialCardsProps {
  testimonials: Testimonial[];
}

export function TestimonialCards({ testimonials }: TestimonialCardsProps) {
  return (
    <div className="mb-12">
      <h2 className="text-xl font-semibold text-center mb-8">
        What Our Users Say
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testimonials.map((testimonial, index) => (
          <Card
            key={index}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 text-yellow-500 fill-yellow-500"
                  />
                ))}
              </div>
              <p className="text-muted-foreground italic mb-4">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {testimonial.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
