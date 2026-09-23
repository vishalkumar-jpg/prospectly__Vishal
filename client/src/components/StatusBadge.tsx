import {
  Shield,
  Crown,
  CheckCircle,
  AlertTriangle,
  Lock,
  Check,
  X,
  Circle,
  Star,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface StatusBadgeProps {
  status: "premium" | "standard" | "warning" | "restricted" | "onboarding";
  size?: "sm" | "md" | "lg";
  variant?: "default" | "icon-only" | "text-only";
  className?: string;
}

// Status Badge Image Component with fallback
function StatusBadgeImage({
  status,
  size = "h-5 w-5",
}: {
  status: string;
  size?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const statusConfig = {
    premium: {
      icon: CheckCircle,
      imageUrl: "/badges/status-elite-purple-transparent.png",
    },
    standard: {
      icon: Star,
      imageUrl: "/badges/status-standard-blue-transparent.png",
    },
    warning: {
      icon: AlertTriangle,
      imageUrl: "/badges/status-warning-orange-transparent.png",
    },
    restricted: {
      icon: X,
      imageUrl: "/badges/status-restricted-red-transparent.png",
    },
    onboarding: {
      icon: Sparkles,
      imageUrl: "/badges/status-standard-blue-transparent.png",
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.standard;
  const Icon = config.icon;

  if (imageError || !config.imageUrl) {
    return <Icon className={size} />;
  }

  return (
    <div className="relative">
      {!imageLoaded && <Icon className={`${size} absolute`} />}
      <img
        src={config.imageUrl}
        alt={`${status} status`}
        className={`${size} object-contain transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    </div>
  );
}

export function StatusBadge({
  status,
  size = "md",
  variant = "default",
  className = "",
}: StatusBadgeProps) {
  const statusConfig = {
    premium: {
      text: "Elite Member",
      variant: "default" as const,
      className:
        "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-400 shadow-lg",
    },
    standard: {
      text: "Trusted Member",
      variant: "secondary" as const,
      className:
        "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400 shadow-lg",
    },
    warning: {
      text: "Developing Member",
      variant: "outline" as const,
      className:
        "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 shadow-lg",
    },
    restricted: {
      text: "Restricted Access",
      variant: "destructive" as const,
      className:
        "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 shadow-lg",
    },
    onboarding: {
      text: "Onboarding Member",
      variant: "secondary" as const,
      className:
        "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 shadow-lg",
    },
  };

  const config = statusConfig[status] || statusConfig.standard;

  const sizeClasses = {
    sm: "text-xs h-8",
    md: "text-sm h-10",
    lg: "text-base h-12",
  };

  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  if (variant === "icon-only") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <StatusBadgeImage status={status} size={iconSizes[size]} />
      </div>
    );
  }

  if (variant === "text-only") {
    return (
      <Badge
        variant={config.variant}
        className={`${config.className} ${sizeClasses[size]} ${className}`}
      >
        {config.text}
      </Badge>
    );
  }

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-2 px-4 ${className}`}
    >
      <StatusBadgeImage status={status} size={iconSizes[size]} />
      {config.text}
    </Badge>
  );
}
