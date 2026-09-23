import type { LucideIcon } from "lucide-react";

export interface PlatformStats {
  users: string;
  introductions: string;
  payoutTotal: string;
  successRate: string;
}

export interface HowItWorksStep {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export interface TrustBadge {
  icon: LucideIcon;
  label: string;
  description: string;
}

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
}

export interface ProspectlyTrustSectionProps {
  variant?: "hero" | "compact";
  showHowItWorks?: boolean;
  showStats?: boolean;
  showTestimonials?: boolean;
  className?: string;
}
