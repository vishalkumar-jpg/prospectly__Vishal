/**
 * Official contact-source provider logos rendered in their real brand colors.
 * Used by the My Contacts source column. Hex values are intentional brand assets.
 */

import { cn } from "@/lib/utils";

const ICON_CLASS = "h-3.5 w-3.5 shrink-0";

export function GoogleLogo({ className = ICON_CLASS }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function MicrosoftLogo({
  className = "h-3 w-3 shrink-0",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 23 23" className={className} aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

export function LinkedInLogo({
  className = ICON_CLASS,
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#0A66C2" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export function AppleLogo({ className = ICON_CLASS }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(className, "text-foreground")}
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.05 12.04c-.03-2.85 2.33-4.22 2.44-4.28-1.33-1.95-3.4-2.22-4.13-2.25-1.76-.18-3.43 1.04-4.32 1.04-.89 0-2.26-1.01-3.72-.99-1.91.03-3.67 1.11-4.65 2.82-1.98 3.44-.51 8.52 1.42 11.31.94 1.37 2.06 2.9 3.53 2.85 1.42-.06 1.95-.92 3.67-.92 1.71 0 2.2.92 3.71.89 1.53-.03 2.5-1.39 3.44-2.77 1.08-1.59 1.53-3.13 1.55-3.21-.03-.01-2.98-1.14-3.01-4.53M14.28 3.7c.78-.95 1.31-2.27 1.16-3.59-1.13.05-2.49.75-3.3 1.7-.72.84-1.36 2.18-1.19 3.47 1.26.1 2.55-.64 3.33-1.58" />
    </svg>
  );
}

/** Returns the provider logo for a normalized source label, or null. */
export function getSourceLogo(source: string) {
  const key = source.toLowerCase();
  if (key.includes("google")) return <GoogleLogo />;
  if (key.includes("microsoft")) return <MicrosoftLogo />;
  if (key.includes("linkedin")) return <LinkedInLogo />;
  if (key.includes("apple") || key.includes("icloud")) return <AppleLogo />;
  return null;
}
