// import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { HeroBackgroundSvg } from "./HeroBackgroundSvg";
import { HeroMockup } from "./HeroMockup";

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

function TpStar() {
  return (
    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-white">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

const tpQuotes = [
  '"Earned $150 from first intro" — ',
  '"Warm paths to 3 VPs" — ',
  '"Real payouts, simple setup" — ',
  '"$400 in first week" — ',
];

const tpAuthors = ["Alex P.", "Maya R.", "Sarah K.", "David L."];

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <HeroBackgroundSvg />
      </div>
      <div
        className={cn(
          "relative z-[1] mx-auto max-w-[1200px] px-4 pb-10 pt-[120px] sm:px-6 md:px-10",
          "max-[900px]:px-5 max-[900px]:pb-12 max-[900px]:pt-[96px]",
          "max-[600px]:px-4 max-[600px]:pb-10 max-[600px]:pt-[88px]"
        )}
      >
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-10 max-[900px]:gap-7">
          <div className="relative z-[2] max-[900px]:text-center">
            <div
              className={cn(
                "mb-[18px] inline-flex items-center gap-1.5 rounded-full border border-home-rose/15 bg-home-rose/5 px-4 py-1.5",
                "text-xs font-bold uppercase tracking-wide text-home-rose motion-safe:animate-home-hero-fade-up opacity-0"
              )}
            >
              <span className="h-1.5 w-1.5 animate-home-blink rounded-full bg-home-rose" />
              Warm Introduction Network
            </div>
            <h1 className="mb-4 text-[28px] font-extrabold leading-[1.04] tracking-tight text-home-fg max-[600px]:text-[28px] lg:text-[50px] lg:tracking-[-2px]">
              <span
                className={cn(
                  "block motion-safe:animate-home-hero-slide-in delay-home-hero-015 opacity-0"
                )}
              >
                Stop cold calling.
              </span>
              <span className="home-hero-grad-line block">
                Start warm connecting.
              </span>
            </h1>
            <p
              className={cn(
                "mb-[22px] max-w-[460px] text-[17px] leading-relaxed text-home-muted motion-safe:animate-home-hero-fade-up delay-home-hero-05 opacity-0",
                "max-[900px]:mx-auto"
              )}
            >
              Join 25,000+ professionals who exchange warm introductions to grow
              their networks and close more deals.
            </p>
            <div
              className={cn(
                "mb-[22px] flex flex-wrap gap-3 motion-safe:animate-home-hero-fade-up delay-home-hero-065 opacity-0",
                "max-[900px]:justify-center max-[600px]:flex-col max-[600px]:items-stretch"
              )}
            >
              {/* Temporarily hidden - signup disabled */}
              {/* <Link
                to="/signup"
                className={cn(
                  "flex items-center justify-center gap-2.5 rounded-xl border-0 bg-gradient-to-br from-home-amethyst to-home-rose px-7 py-3.5",
                  "text-[15px] font-bold text-white shadow-home-cta transition-transform hover:-translate-y-0.5",
                )}
              >
                <GoogleIcon />
                Sign Up with Google
              </Link> */}
              {/* Temporarily hidden - signup disabled */}
              {/* <Link
                to="/signup"
                className={cn(
                  "flex items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-home-border bg-home-bg px-7 py-3.5 text-[15px] font-bold text-home-fg",
                  "transition-transform hover:-translate-y-0.5 hover:border-home-amethyst",
                )}
              >
                <MicrosoftIcon />
                Sign Up with Microsoft
              </Link> */}
            </div>
            <div
              className={cn(
                "mb-[18px] flex flex-wrap gap-5 text-sm text-home-muted motion-safe:animate-home-hero-fade-up delay-home-hero-08 opacity-0",
                "max-[900px]:justify-center max-[600px]:flex-col max-[600px]:items-center max-[600px]:gap-2"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-home-rose" />
                <span>
                  <b className="text-home-fg">10,800+</b> warm introductions
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-home-amethyst" />
                <span>
                  <b className="text-home-fg">98%</b> intro success
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-home-sky" />
                <span>
                  <b className="text-home-fg">1.7 days</b> avg intro time
                </span>
              </div>
            </div>
            <div
              className={cn(
                "inline-flex w-full max-w-[520px] flex-col gap-1 rounded-lg border border-home-border bg-home-bg px-3.5 py-2 motion-safe:animate-home-hero-fade-up delay-home-hero-095 opacity-0",
                "max-[900px]:mx-auto"
              )}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex gap-px">
                  <div className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-home-trust-green">
                    <TpStar />
                  </div>
                  <div className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-home-trust-green">
                    <TpStar />
                  </div>
                  <div className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-home-trust-green">
                    <TpStar />
                  </div>
                  <div className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-home-trust-green">
                    <TpStar />
                  </div>
                  <div className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-gradient-to-r from-home-trust-green from-50% to-home-star-muted to-50%">
                    <TpStar />
                  </div>
                </div>
                <div className="text-[11px] text-home-muted">
                  <b className="text-home-fg">4.8</b> ·{" "}
                  <span className="font-bold text-home-trust-green">
                    Excellent
                  </span>{" "}
                  on Trustpilot
                </div>
              </div>
              <div className="h-4 overflow-hidden">
                <div className="flex w-max animate-gs-marquee items-center gap-7 whitespace-nowrap">
                  {[0, 1].map((dup) => (
                    <div key={dup} className="flex gap-7">
                      {tpQuotes.map((q, i) => (
                        <div
                          key={`${dup}-${i}`}
                          className="text-[11px] text-home-muted"
                        >
                          {q}
                          <b className="font-semibold text-home-fg">
                            {tpAuthors[i]}
                          </b>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <HeroMockup />
        </div>
      </div>
    </div>
  );
}
