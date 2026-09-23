import { Card, CardContent } from "@/components/ui/card";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { PremiumAvatar } from "@/components/shared/PremiumAvatar";
import { StarRating } from "@/components/shared/StarRating";
import { toUTC } from "@/lib/dayjs";

interface PeerFeedbackCardProps {
  feedback: {
    id: string;
    rating: number;
    feedbackText: string | null;
    feedbackFromUser: {
      id: string;
      fullName: string | null;
      company: string | null;
      profilePhotoUrl?: string | null;
    };
    introductionRequest: {
      id: string;
      contactName: string;
    };
    createdAt: string;
  };
}

export function PeerFeedbackCard({ feedback }: PeerFeedbackCardProps) {
  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[''] before:origin-center before:scale-y-0 before:bg-gradient-to-b before:from-brand-amethyst before:to-brand-rose before:transition-transform before:duration-300 hover:-translate-y-0.5 hover:shadow-brand-card hover:before:scale-y-100">
      <CardContent className="p-3">
        <div className="space-y-2.5">
          {/* Header: User info and rating */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PremiumAvatar
                name={feedback.feedbackFromUser.fullName || "Anonymous"}
                size="sm"
                imageUrl={feedback.feedbackFromUser.profilePhotoUrl || null}
                showPurpleRing={false}
              />
              <div className="space-y-0 text-left">
                <p className="font-semibold text-xs text-foreground leading-tight">
                  {feedback.feedbackFromUser.fullName || "Anonymous"}
                </p>
                {feedback.feedbackFromUser.company && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-brand-sky" />
                    {feedback.feedbackFromUser.company}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 rounded-full border border-brand-warning/20 bg-brand-warning/10 px-2 py-0.5">
                <StarRating
                  rating={feedback.rating}
                  size="sm"
                  colorScheme="yellow"
                />
                <span className="text-[11px] font-bold text-brand-warning">
                  {feedback.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback text */}
          {feedback.feedbackText && (
            <div className="relative">
              <p className="text-[11px] text-foreground/80 leading-normal pl-2.5 border-l-2 border-border italic">
                "{feedback.feedbackText}"
              </p>
            </div>
          )}

          {/* Footer: Introduction context and date */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground overflow-hidden">
              <span className="px-1.5 py-0.5 rounded bg-brand-amethyst/10 text-brand-amethyst flex-shrink-0">
                Intros
              </span>
              <span className="font-semibold text-foreground/80 truncate">
                {feedback.introductionRequest.contactName}
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
              {formatLocalizedShortDateTime(toUTC(feedback.createdAt))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
