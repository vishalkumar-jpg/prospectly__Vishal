import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidPhotoUrl } from "@/utils/security";

interface PremiumAvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  qualityScore?: number;
  showVerified?: boolean;
  className?: string;
  imageUrl?: string | null;
  showPurpleRing?: boolean;
  fallbackBgColor?: string;
  fallbackTextColor?: string;
}

export function PremiumAvatar({
  name,
  size = "md",
  qualityScore,
  showVerified = false,
  className,
  imageUrl,
  showPurpleRing = true,
  fallbackBgColor,
  fallbackTextColor,
}: PremiumAvatarProps) {
  const [, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const validImageUrl = isValidPhotoUrl(imageUrl) ? imageUrl!.trim() : null;

  // Reset state when imageUrl changes
  useEffect(() => {
    if (!validImageUrl) {
      setImageLoaded(false);
      setImageError(true);
      return;
    }

    setImageLoaded(false);
    setImageError(false);
  }, [validImageUrl]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoaded(false);
    setImageError(true);
    // Debug logging (can be removed in production)
    if (import.meta.env.DEV) {
      // Debug: image failed to load
    }
  }, []);
  const sizes = {
    xs: {
      avatar: "h-8 w-8",
      ring: "w-10 h-10",
      badge: "h-2.5 w-2.5",
      badgePosition: "-bottom-0.5 -right-0.5",
      text: "text-[10px]",
      middleRing: "-inset-[4px]",
      innerRing: "-inset-[2px]",
      ringOffset: "-left-1 -top-1",
    },
    sm: {
      avatar: "h-10 w-10",
      ring: "w-12 h-12",
      badge: "h-3 w-3",
      badgePosition: "-bottom-0.5 -right-0.5",
      text: "text-xs",
      middleRing: "-inset-[4px]",
      innerRing: "-inset-[2px]",
      ringOffset: "-left-1 -top-1",
    },
    md: {
      avatar: "h-14 w-14",
      ring: "w-16 h-16",
      badge: "h-3.5 w-3.5",
      badgePosition: "-bottom-1 -right-1",
      text: "text-sm",
      middleRing: "-inset-[6px]",
      innerRing: "-inset-[3px]",
      ringOffset: "-left-1 -top-1",
    },
    lg: {
      avatar: "h-20 w-20",
      ring: "w-24 h-24",
      badge: "h-4 w-4",
      badgePosition: "-bottom-1 -right-1",
      text: "text-base",
      middleRing: "-inset-[8px]",
      innerRing: "-inset-[4px]",
      ringOffset: "-left-2 -top-2",
    },
  };

  const getQualityColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-amber-500";
    return "text-orange-500";
  };

  return (
    <div className={cn("relative flex-shrink-0", className)}>
      {qualityScore !== undefined && qualityScore !== null && (
        <svg
          className={cn("absolute", sizes[size].ringOffset, sizes[size].ring)}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/20"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className={cn(
              "transition-all duration-500",
              getQualityColor(qualityScore)
            )}
            style={{
              strokeDasharray: `${2 * Math.PI * 45}`,
              strokeDashoffset: `${2 * Math.PI * 45 * (1 - qualityScore / 10)}`,
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
            }}
          />
        </svg>
      )}

      <div className="relative inline-flex items-center justify-center">
        {showPurpleRing && (
          <>
            {/* Middle Ring Layer */}
            <div
              className={cn(
                "absolute bg-gradient-to-r from-primary via-purple-600 to-blue-600 rounded-full opacity-75 animate-spin-slow",
                sizes[size].middleRing
              )}
            ></div>
            {/* Inner Ring Layer */}
            <div
              className={cn(
                "absolute bg-background rounded-full",
                sizes[size].innerRing
              )}
            ></div>
          </>
        )}

        <Avatar
          className={cn(
            sizes[size].avatar,
            "relative z-10",
            showPurpleRing
              ? "border-background shadow-2xl"
              : "ring-2 ring-background shadow-lg"
          )}
        >
          {validImageUrl && !imageError && (
            <AvatarImage
              src={validImageUrl}
              alt={name}
              className="object-cover"
              referrerPolicy="no-referrer"
              {...(import.meta.env.MODE === "local" && {
                crossOrigin: "anonymous",
              })}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
          <AvatarFallback
            className={cn(
              sizes[size].text,
              "font-bold",
              fallbackBgColor && fallbackTextColor
                ? `${fallbackBgColor} ${fallbackTextColor}`
                : "bg-gradient-to-br from-primary/30 to-primary/15"
            )}
          >
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {showVerified && (
        <div
          className={cn(
            "absolute z-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-1 shadow-lg ring-2 ring-background",
            sizes[size].badgePosition
          )}
        >
          <CheckCircle2 className={cn("text-white", sizes[size].badge)} />
        </div>
      )}
    </div>
  );
}
