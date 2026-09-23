import { Linkedin, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function toLinkedInHref(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

interface LinkedInFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string | undefined;
  userLinkedInUrl: string | undefined;
}

export function LinkedInField({
  value,
  onChange,
  onBlur,
  error,
  userLinkedInUrl,
}: LinkedInFieldProps) {
  if (userLinkedInUrl) {
    const href = toLinkedInHref(userLinkedInUrl);
    return (
      <div className="rounded-lg border border-brand-amethyst/20 bg-gradient-to-br from-brand-amethyst/5 to-brand-rose/5 p-4 w-full overflow-hidden">
        <div className="flex items-center gap-3 w-full min-w-0">
          <div className="h-10 w-10 rounded-full bg-brand-amethyst/10 flex items-center justify-center flex-shrink-0">
            <Linkedin className="h-5 w-5 text-[#0A66C2]" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-brand-amethyst truncate">
              LinkedIn Profile
            </p>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={href}
              className="text-xs text-[#0A66C2] underline underline-offset-2 hover:text-[#004182] break-all line-clamp-2"
            >
              {href}
            </a>
          </div>
          <CheckCircle className="h-5 w-5 text-brand-amethyst flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="linkedin" className="flex items-center gap-2">
        <Linkedin className="h-4 w-4 text-[#0A66C2]" />
        LinkedIn Profile URL
        <span className="text-xs font-normal text-slate-500">(optional)</span>
      </Label>
      <Input
        id="linkedin"
        placeholder="https://linkedin.com/in/yourprofile"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn(
          "h-11",
          error &&
            "border-destructive focus-visible:ring-1 focus-visible:ring-destructive focus-visible:ring-offset-0"
        )}
        aria-invalid={!!error}
      />
      {error ? (
        <p className="text-sm font-medium text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-slate-500">
          Optional — helps recruiters learn more about you.
        </p>
      )}
    </div>
  );
}
