import {
  MapPin,
  Briefcase,
  DollarSign,
  Linkedin,
  Send,
  CheckCircle,
  Github,
  Twitter,
  Facebook,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { Button } from "@/components/ui/button";

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const isValidUrl = (url: string | null): url is string =>
  !!url && /^https?:\/\//i.test(url);

interface ContactProfileHeroProps {
  fullName: string;
  headline: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  profilePhotoUrl: string | null;
  bountyAmount: string | number;
  isBountyCalculating: boolean;
  linkedin: string | null;
  githubUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  emailStatus: string | null;
  hasEmail?: boolean;
  isCheckingOwnership?: boolean;
  onRequestIntroduction?: () => void;
}

export function ContactProfileHero({
  fullName,
  headline,
  title,
  company,
  location,
  profilePhotoUrl,
  bountyAmount,
  isBountyCalculating,
  linkedin,
  githubUrl,
  twitterUrl,
  facebookUrl,
  emailStatus,
  hasEmail,
  isCheckingOwnership,
  onRequestIntroduction,
}: ContactProfileHeroProps) {
  const numericBounty = Number(bountyAmount) || 0;
  const formattedDisplay = numericBounty.toLocaleString(undefined, {
    minimumFractionDigits: numericBounty % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 px-6 py-3">
      <div className="flex items-center gap-4 ml-1">
        <PremiumAvatar
          size="md"
          imageUrl={profilePhotoUrl}
          name={fullName}
          showPurpleRing={false}
          fallbackBgColor="bg-violet-100"
          fallbackTextColor="text-violet-700"
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {fullName}
          </h2>
          {(title || company) && (
            <p className="text-sm text-gray-700 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <span className="truncate">
                {title ? capitalizeFirst(title) : ""}
                {title && company ? " at " : ""}
                {company}
              </span>
            </p>
          )}
          {location && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
              {capitalizeFirst(location)}
            </p>
          )}
          <div className="flex items-center gap-3">
            {isValidUrl(linkedin) && (
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0A66C2] hover:text-[#004182] inline-flex items-center gap-1.5 hover:underline"
              >
                <Linkedin className="h-3 w-3 flex-shrink-0" />
                <span>LinkedIn Profile</span>
              </a>
            )}
            {isValidUrl(githubUrl) && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-700 hover:text-gray-900 inline-flex items-center gap-1.5 hover:underline"
              >
                <Github className="h-3 w-3 flex-shrink-0" />
                <span>GitHub</span>
              </a>
            )}
            {isValidUrl(twitterUrl) && (
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1DA1F2] hover:text-[#0d8bd9] inline-flex items-center gap-1.5 hover:underline"
              >
                <Twitter className="h-3 w-3 flex-shrink-0" />
                <span>Twitter</span>
              </a>
            )}
            {isValidUrl(facebookUrl) && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#1877F2] hover:text-[#0d5bbd] inline-flex items-center gap-1.5 hover:underline"
              >
                <Facebook className="h-3 w-3 flex-shrink-0" />
                <span>Facebook</span>
              </a>
            )}
            {emailStatus === "verified" && (
              <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
                <CheckCircle className="h-3 w-3 flex-shrink-0" />
                Email Verified
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 relative">
          <div className="flex w-[148px] flex-col items-stretch gap-2">
            <div className="w-full rounded-lg border border-violet-200 bg-violet-100 px-4 py-2 text-center dark:border-violet-800 dark:bg-violet-900/30">
              {isBountyCalculating ? (
                <div className="flex flex-col items-center justify-center gap-1 py-0.5 min-h-[2rem]">
                  <Loader2
                    className="h-5 w-5 animate-spin text-violet-600 dark:text-violet-400"
                    aria-hidden
                  />
                  <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">
                    Calculating…
                  </span>
                </div>
              ) : (
                <p className="text-2xl font-extrabold text-violet-700 dark:text-violet-300">
                  ${formattedDisplay}
                </p>
              )}
              <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5">
                Referral Payout
              </p>
            </div>

            {onRequestIntroduction && hasEmail !== false && (
              <Button
                size="sm"
                onClick={onRequestIntroduction}
                disabled={isCheckingOwnership}
                className="w-full px-4 bg-brand-gradient text-white shadow-brand-cta transition-all hover:-translate-y-0.5 hover:shadow-brand-cta-lg"
              >
                {isCheckingOwnership ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isCheckingOwnership ? "Checking..." : "Request Intro"}
              </Button>
            )}
          </div>

          {onRequestIntroduction && hasEmail === false && (
            <div className="absolute top-full right-0 mt-2 bg-gradient-to-r from-red-400 via-red-500 to-red-600 rounded-lg p-[2px]">
              <div className="bg-amber-50 rounded-md px-3 py-2 flex items-center gap-2 whitespace-nowrap">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Email unavailable — an email address is required to send
                  introduction requests for this contact.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
