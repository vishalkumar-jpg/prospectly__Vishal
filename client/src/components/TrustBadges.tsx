import {
  Shield,
  Check,
  Users,
  Award,
  Clock,
  Star,
  Building,
  MessageSquare,
  Trophy,
  UserCheck,
  CheckCircle,
  Smartphone,
  Mail,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface TrustBadgesProps {
  variant?: "default" | "compact" | "inline";
  className?: string;
  earnedBadges?: string[];
  showOnlyEarned?: boolean;
  filterType?: "all" | "actionable" | "achievement";
}

interface BadgeData {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  imageUrl: string;
}

// Badge Image Component with fallback
function BadgeImage({
  badge,
  size = "h-5 w-5",
}: {
  badge: BadgeData;
  size?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const Icon = badge.icon;

  // Always show the image first, fallback to icon if it fails
  return (
    <div className="relative">
      <img
        src={badge.imageUrl}
        alt={badge.text}
        className={`${size} object-contain transition-opacity duration-200`}
        onError={() => setImageError(true)}
        style={{ display: imageError ? "none" : "block" }}
      />
      {imageError && <Icon className={size} />}
    </div>
  );
}

export function TrustBadges({
  variant = "default",
  className = "",
  earnedBadges = [],
  showOnlyEarned = false,
  filterType = "all",
}: TrustBadgesProps) {
  const navigate = useNavigate();

  // Function to get navigation link for each badge
  const getBadgeLink = (badgeId: string) => {
    switch (badgeId) {
      case "verified-email":
        return "/profile/user-profile?highlight=email";
      case "verified-phone":
        return "/profile/user-profile?highlight=phone";
      case "linkedin-connected":
        return "/profile/user-profile?highlight=linkedin";
      case "google-contacts":
      case "microsoft-contacts":
      case "apple-contacts":
        return "/getting-started";
      case "high-success-rate":
      case "quick-responder":
        return "/prospecting/incoming-requests";
      case "quality-introductions":
        return "/prospecting/incoming-requests";
      case "positive-reviews-5":
        return "/prospecting/incoming-requests";
      case "positive-reviews-25":
        return "/prospecting/incoming-requests";
      case "community-contributor":
        return "/getting-started?step=3";
      case "industry-association":
        return "/profile/organizations";
      case "long-term-member":
        return "/profile";
      case "dispute-free":
        return "/prospecting/incoming-requests";
      default:
        return null;
    }
  };

  const allBadges = [
    // Security & Compliance (Actionable)
    {
      id: "verified-email",
      icon: CheckCircle,
      text: "Email Verified",
      category: "verification",
      color:
        "bg-green-50 text-green-700 hover:bg-green-700 hover:text-green-50 border-green-200",
      imageUrl: "/badges/verified-email.png",
      points: 2,
      isActionable: true,
    },
    {
      id: "verified-phone",
      icon: Shield,
      text: "Phone Verified",
      category: "verification",
      color:
        "bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-blue-50 border-blue-200",
      imageUrl: "/badges/verified-phone.png",
      points: 2,
      isActionable: true,
    },
    {
      id: "linkedin-connected",
      icon: Building,
      text: "LinkedIn Connected",
      category: "verification",
      color:
        "bg-purple-50 text-purple-700 hover:bg-purple-700 hover:text-purple-50 border-purple-200",
      imageUrl: "/badges/linkedin-connected.png",
      points: 2,
      isActionable: true,
    },

    // Contact Import Badges (Actionable)
    {
      id: "google-contacts",
      icon: Mail,
      text: "Google Contacts Imported",
      category: "contacts",
      color:
        "bg-red-50 text-red-700 hover:bg-red-700 hover:text-red-50 border-red-200",
      imageUrl: "/badges/google-contacts.png",
      points: 2,
      isActionable: true,
    },
    {
      id: "microsoft-contacts",
      icon: Building,
      text: "Microsoft Contacts Imported",
      category: "contacts",
      color:
        "bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-blue-50 border-blue-200",
      imageUrl: "/badges/microsoft-contacts.png",
      points: 2,
      isActionable: true,
    },
    {
      id: "apple-contacts",
      icon: Smartphone,
      text: "Apple Contacts Imported",
      category: "contacts",
      color:
        "bg-gray-50 text-gray-700 hover:bg-gray-700 hover:text-gray-50 border-gray-200",
      imageUrl: "/badges/apple-contacts.png",
      points: 2,
      isActionable: true,
    },

    // Performance Badges (Achievement-based)
    {
      id: "high-success-rate",
      icon: Star,
      text: "90%+ Success Rate",
      category: "performance",
      color:
        "bg-yellow-50 text-yellow-700 hover:bg-yellow-700 hover:text-yellow-50 border-yellow-200",
      imageUrl: "/badges/high-success-rate.png",
      points: 2,
      isActionable: false,
    },
    {
      id: "quick-responder",
      icon: Clock,
      text: "Quick Responder (<2hrs)",
      category: "performance",
      color:
        "bg-indigo-50 text-indigo-700 hover:bg-indigo-700 hover:text-indigo-50 border-indigo-200",
      imageUrl: "/badges/quick-responder.png",
      points: 2,
      isActionable: false,
    },
    {
      id: "quality-introductions",
      icon: Award,
      text: "Quality Introductions",
      category: "performance",
      color:
        "bg-emerald-50 text-emerald-700 hover:bg-emerald-700 hover:text-emerald-50 border-emerald-200",
      imageUrl: "/badges/quality-introductions.png",
      points: 2,
      isActionable: false,
    },

    // Community Badges (Progressive milestones)
    {
      id: "positive-reviews-5",
      icon: MessageSquare,
      text: "First 5 Quality Reviews",
      category: "community",
      color:
        "bg-rose-50 text-rose-700 hover:bg-rose-700 hover:text-rose-50 border-rose-200",
      imageUrl: "/badges/positive-reviews-5.png",
      points: 2,
      isActionable: false,
    },
    {
      id: "positive-reviews-25",
      icon: Trophy,
      text: "25 Quality Reviews",
      category: "community",
      color:
        "bg-orange-50 text-orange-700 hover:bg-orange-700 hover:text-orange-50 border-orange-200",
      imageUrl: "/badges/positive-reviews-25.png",
      points: 2,
      isActionable: false,
    },
    {
      id: "community-contributor",
      icon: Users,
      text: "Community Contributor",
      category: "community",
      color:
        "bg-cyan-50 text-cyan-700 hover:bg-cyan-700 hover:text-cyan-50 border-cyan-200",
      imageUrl: "/badges/community-contributor.png",
      points: 2,
      isActionable: true,
    },

    // Professional Badges
    {
      id: "industry-association",
      icon: Building,
      text: "Professional Association Member",
      category: "professional",
      color:
        "bg-violet-50 text-violet-700 hover:bg-violet-700 hover:text-violet-50 border-violet-200",
      imageUrl: "/badges/industry-association.png",
      points: 2,
      isActionable: true,
    },
    {
      id: "long-term-member",
      icon: UserCheck,
      text: "Veteran Member (1yr+)",
      category: "professional",
      color:
        "bg-amber-50 text-amber-700 hover:bg-amber-700 hover:text-amber-50 border-amber-200",
      imageUrl: "/badges/long-term-member.png",
      points: 2,
      isActionable: false,
    },
    {
      id: "dispute-free",
      icon: Check,
      text: "Dispute-Free Record",
      category: "professional",
      color:
        "bg-teal-50 text-teal-700 hover:bg-teal-700 hover:text-teal-50 border-teal-200",
      imageUrl: "/badges/dispute-free.png",
      points: 2,
      isActionable: false,
    },
  ];

  const badges = showOnlyEarned
    ? allBadges.filter((badge) => earnedBadges.includes(badge.id))
    : filterType === "actionable"
      ? allBadges.filter((badge) => badge.isActionable)
      : filterType === "achievement"
        ? allBadges.filter((badge) => !badge.isActionable)
        : allBadges;

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {badges.map((badge, index) => {
          const isEarned = earnedBadges.includes(badge.id);
          return (
            <Badge
              key={index}
              variant="outline"
              className={`text-xs flex items-center gap-1 transition-all duration-300 ${
                isEarned ? "animate-pulse shadow-lg" : ""
              }`}
            >
              <BadgeImage badge={badge} size="h-3 w-3" />
              {badge.text}
            </Badge>
          );
        })}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={`flex flex-wrap gap-1 text-xs text-muted-foreground ${className}`}
      >
        {badges.map((badge, index) => {
          return (
            <span key={index} className="flex items-center gap-1">
              <BadgeImage badge={badge} size="h-3 w-3" />
              {badge.text}
              {index < badges.length - 1 && <span className="mx-1">•</span>}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}
    >
      {badges.map((badge, index) => {
        const isEarned = earnedBadges.includes(badge.id);
        const badgeLink = getBadgeLink(badge.id);

        const badgeContent = (
          <div className="flex items-start gap-3 w-full">
            <div className="flex-shrink-0 mt-0.5">
              <BadgeImage badge={badge} size="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-sm font-medium block leading-tight">
                {badge.text}
              </span>
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />
                <span className="text-xs font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent whitespace-nowrap">
                  +{badge.points} pts
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 ml-auto">
              {isEarned ? (
                <div className="bg-green-100 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              ) : badge.isActionable && badgeLink ? (
                <span className="text-xs font-semibold text-primary underline whitespace-nowrap">
                  Earn
                </span>
              ) : !badge.isActionable ? (
                <Clock className="h-4 w-4 text-muted-foreground" />
              ) : null}
            </div>
          </div>
        );

        // Only make actionable badges clickable
        if (badgeLink && !isEarned && badge.isActionable) {
          return (
            <div
              key={index}
              onClick={() => navigate(badgeLink)}
              className={`p-3 min-h-[80px] rounded-lg border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer group ${
                isEarned
                  ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 text-green-800 shadow-md"
                  : "bg-gradient-to-br from-background to-muted/30 border-border hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10"
              }`}
            >
              {badgeContent}
            </div>
          );
        }

        return (
          <div
            key={index}
            className={`p-3 min-h-[80px] rounded-lg border transition-all duration-300 ${
              isEarned
                ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 text-green-800 shadow-md hover:shadow-lg"
                : badge.isActionable
                  ? "bg-gradient-to-br from-background to-muted/30 border-border"
                  : "bg-gradient-to-br from-background to-muted/30 border-muted-foreground/20"
            }`}
          >
            {badgeContent}
          </div>
        );
      })}
    </div>
  );
}
