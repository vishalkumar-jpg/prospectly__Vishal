import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CtaBgSvg } from "./CtaBgSvg";

// function GoogleIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0">
//       <path
//         d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
//         className="fill-home-oauth-g-blue"
//       />
//       <path
//         d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//         className="fill-home-oauth-g-green"
//       />
//       <path
//         d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
//         className="fill-home-oauth-g-yellow"
//       />
//       <path
//         d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//         className="fill-home-oauth-g-red"
//       />
//     </svg>
//   );
// }

// function MicrosoftIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0">
//       <rect
//         x="1"
//         y="1"
//         width="10"
//         height="10"
//         className="fill-home-oauth-ms-red"
//       />
//       <rect
//         x="13"
//         y="1"
//         width="10"
//         height="10"
//         className="fill-home-oauth-ms-green"
//       />
//       <rect
//         x="1"
//         y="13"
//         width="10"
//         height="10"
//         className="fill-home-oauth-ms-blue"
//       />
//       <rect
//         x="13"
//         y="13"
//         width="10"
//         height="10"
//         className="fill-home-oauth-ms-yellow"
//       />
//     </svg>
//   );
// }

export function CtaSection() {
  return (
    <div className="relative overflow-hidden bg-home-cta px-4 py-16 text-center sm:px-6 md:px-10 max-[900px]:px-5 max-[900px]:py-14">
      <div
        className="pointer-events-none absolute -left-[10%] -top-[20%] h-[70%] w-1/2 rounded-full bg-[radial-gradient(ellipse,hsl(var(--home-amethyst)/0.08),transparent_60%)] blur-[60px] motion-safe:animate-home-cta-orb"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[10%] -right-[5%] h-[60%] w-[40%] rounded-full bg-[radial-gradient(ellipse,hsl(var(--home-rose)/0.06),transparent_60%)] blur-[60px] motion-safe:animate-home-cta-orb delay-home-cta-orb"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <CtaBgSvg />
      </div>
      <div className="relative z-[1] mx-auto max-w-[1200px]">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-home-amethyst">
          Ready to Transform Your Network?
        </div>
        <h2 className="mb-2 text-[28px] font-extrabold leading-tight tracking-tight text-home-fg max-[900px]:text-[28px] lg:text-[38px] lg:tracking-[-1px]">
          Stop Cold Calling.
          <br />
          <span
            className={cn(
              "home-text-brand-gradient inline-block animate-home-grad-shift",
            )}
          >
            Start Warm Connecting.
          </span>
        </h2>
        <p className="mx-auto mb-7 max-w-[460px] text-[15px] text-home-muted">
          Join 25,000+ professionals who&apos;ve transformed their sales
          pipeline with AI-powered warm introductions.
        </p>
        <div className="mb-7 flex flex-wrap justify-center gap-8">
          <div>
            <div className="font-mono text-[28px] font-extrabold tracking-tight text-home-fg">
              85%
            </div>
            <div className="text-xs text-home-muted">matching rate</div>
          </div>
          <div>
            <div className="font-mono text-[28px] font-extrabold tracking-tight text-home-fg">
              25K+
            </div>
            <div className="text-xs text-home-muted">active members</div>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap justify-center gap-3 max-[600px]:flex-col max-[600px]:items-center">
          {/* Temporarily hidden - signup disabled */}
          {/* <Link
            to="/signup"
            className="flex min-w-[220px] items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-home-amethyst to-home-rose px-8 py-3.5 text-[15px] font-bold text-white shadow-home-cta transition-transform hover:-translate-y-0.5 hover:shadow-home-cta-lg"
          >
            <GoogleIcon />
            Sign Up with Google
          </Link> */}
          {/* Temporarily hidden - signup disabled */}
          {/* <Link
            to="/signup"
            className="flex min-w-[220px] items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-home-border bg-transparent px-8 py-3.5 text-[15px] font-bold text-home-fg transition-transform hover:-translate-y-0.5 hover:border-home-amethyst hover:bg-home-bg-elevated"
          >
            <MicrosoftIcon />
            Sign Up with Microsoft
          </Link> */}
        </div>
        <div className="mb-2.5 flex flex-wrap justify-center gap-4 text-xs text-home-muted">
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-home-trust-green" strokeWidth={2.5} />
            Free to join
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-home-trust-green" strokeWidth={2.5} />
            No credit card required
          </span>
        </div>
        <p className="text-[10px] text-home-muted">
          By signing up, you agree to our{" "}
          <Link
            to="/terms"
            className="text-home-amethyst no-underline hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy"
            className="text-home-amethyst no-underline hover:underline"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
