import {
  Shield,
  Users,
  Handshake,
  DollarSign,
  Lock,
  CheckCircle,
} from "lucide-react";
import type {
  PlatformStats,
  HowItWorksStep,
  TrustBadge,
  Testimonial,
} from "./types";

export const platformStats: PlatformStats = {
  users: "10,000+",
  introductions: "25,000+",
  payoutTotal: "$2.5M+",
  successRate: "94%",
};

export const howItWorksSteps: HowItWorksStep[] = [
  {
    number: 1,
    title: "Connect",
    description: "Sign up and import your professional network",
    icon: Users,
    color: "bg-blue-500",
  },
  {
    number: 2,
    title: "Introduce",
    description: "Make warm introductions to earn bounties",
    icon: Handshake,
    color: "bg-green-500",
  },
  {
    number: 3,
    title: "Earn",
    description: "Get paid when meetings are completed",
    icon: DollarSign,
    color: "bg-purple-500",
  },
];

export const trustBadges: TrustBadge[] = [
  {
    icon: Shield,
    label: "Bank-Level Security",
    description: "256-bit encryption",
  },
  {
    icon: Lock,
    label: "Privacy First",
    description: "Your contacts stay private",
  },
  {
    icon: CheckCircle,
    label: "Verified Users",
    description: "Identity verification",
  },
];

export const testimonials: Testimonial[] = [
  {
    name: "Sarah M.",
    role: "Sales Director",
    company: "TechCorp",
    quote:
      "Prospectly helped me earn $3,000 in my first month just by introducing people I already knew.",
    rating: 5,
  },
  {
    name: "Michael R.",
    role: "Entrepreneur",
    company: "StartupXYZ",
    quote:
      "The trust verification system gave me confidence that I was dealing with real professionals.",
    rating: 5,
  },
];
