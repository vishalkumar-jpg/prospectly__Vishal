import { useState, useEffect, useCallback } from "react";
import { Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  imageUrl?: string | null;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showVerifiedBadge?: boolean;
  isProfileLoading?: boolean;
  isUploading?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: {
    avatar: "h-12 w-12",
    fallback: "text-sm",
    badge: "bottom-0 right-0 p-0.5",
    icon: "h-2.5 w-2.5",
    loader: "h-4 w-4",
    middleRing: "-inset-[4px]",
    innerRing: "-inset-[2px]",
  },
  md: {
    avatar: "h-16 w-16",
    fallback: "text-base",
    badge: "bottom-0.5 right-0.5 p-1",
    icon: "h-3 w-3",
    loader: "h-5 w-5",
    middleRing: "-inset-[6px]",
    innerRing: "-inset-[3px]",
  },
  lg: {
    avatar: "h-24 w-24",
    fallback: "text-lg",
    badge: "bottom-1 right-1 p-1",
    icon: "h-3.5 w-3.5",
    loader: "h-6 w-6",
    middleRing: "-inset-[7px]",
    innerRing: "-inset-[3px]",
  },
  xl: {
    avatar: "h-40 w-40",
    fallback: "text-3xl",
    badge: "bottom-2 right-2 p-1.5",
    icon: "h-4 w-4",
    loader: "h-10 w-10",
    middleRing: "-inset-2",
    innerRing: "-inset-1",
  },
};

export function ProfileAvatar({
  imageUrl,
  firstName,
  lastName,
  fullName,
  size = "md",
  showVerifiedBadge = false,
  isProfileLoading = false,
  isUploading = false,
  className,
}: ProfileAvatarProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setImageLoaded(false);
      setImageError(true);
      return;
    }

    setImageLoaded(false);
    setImageError(false);
  }, [imageUrl]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoaded(false);
    setImageError(true);
  }, []);

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`;
    }
    if (fullName) {
      return fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2);
    }
    return "??";
  };

  const hasImageUrl = !!imageUrl;
  const isImageLoading = hasImageUrl && !imageLoaded && !imageError;
  // Show loader if profile data is loading OR if image is loading OR if photo is uploading
  const showLoader = isProfileLoading || isImageLoading || isUploading;

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
    >
      <div className="relative">
        <div
          className={cn(
            "absolute bg-gradient-to-r from-primary via-purple-600 to-blue-600 rounded-full opacity-75 animate-spin-slow",
            classes.middleRing
          )}
        ></div>

        <div
          className={cn(
            "absolute bg-background rounded-full",
            classes.innerRing
          )}
        ></div>

        <div
          className={cn(
            "relative rounded-full border-4 border-background overflow-hidden",
            classes.avatar
          )}
        >
          {/* Show initials ONLY when profile is loaded, no image URL exists, and image failed/no image */}
          {!isProfileLoading && (!hasImageUrl || imageError) && (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center font-bold bg-gradient-to-br from-primary/20 to-purple-600/20 text-primary",
                classes.fallback
              )}
            >
              {getInitials()}
            </div>
          )}

          {/* Show loader when profile is loading OR image is loading */}
          {showLoader && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-600/20 z-10">
              <Loader2
                className={cn(classes.loader, "animate-spin text-primary/60")}
              />
            </div>
          )}

          {/* Image with fade-in transition */}
          {hasImageUrl && !imageError && (
            <img
              src={imageUrl}
              alt="Profile"
              referrerPolicy="no-referrer"
              {...(import.meta.env.MODE == "local" && {
                crossOrigin: "anonymous",
                loading: "lazy",
              })}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={cn(
                "absolute inset-0 h-full w-full object-cover z-20 transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          )}
        </div>
      </div>

      {showVerifiedBadge && (
        <div
          className={cn(
            "absolute z-30 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-lg border-2 border-background",
            classes.badge
          )}
        >
          <Shield className={cn(classes.icon, "text-white")} />
        </div>
      )}
    </div>
  );
}
