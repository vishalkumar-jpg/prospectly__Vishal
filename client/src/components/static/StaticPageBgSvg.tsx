import { useId } from "react";

export type StaticPageBgVariant = "default" | "legal" | "cta";

interface StaticPageBgSvgProps {
  variant?: StaticPageBgVariant;
}

/**
 * Ambient SVG background used behind static-page heroes / CTA bands.
 * Matches the visual language of `HeroBackgroundSvg` / `CtaBgSvg` but lighter.
 * Uses the same `home-amethyst` / `home-rose` / `home-sky` tokens so it
 * follows dark-mode automatically.
 */
export function StaticPageBgSvg({ variant = "default" }: StaticPageBgSvgProps) {
  const uid = useId().replace(/:/g, "");
  const gradAmethystRose = `sp-ar-${uid}`;
  const gradRoseSky = `sp-rs-${uid}`;
  const pathA = `sp-pa-${uid}`;
  const pathB = `sp-pb-${uid}`;

  if (variant === "legal") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <circle
          cx="120"
          cy="80"
          r="220"
          fill={`url(#${gradAmethystRose})`}
          opacity=".35"
        />
        <circle
          cx="1320"
          cy="140"
          r="260"
          fill={`url(#${gradRoseSky})`}
          opacity=".25"
        />
        <defs>
          <radialGradient id={gradAmethystRose}>
            <stop stopColor="hsl(var(--home-amethyst))" stopOpacity=".25" />
            <stop offset="1" stopColor="hsl(var(--home-amethyst))" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={gradRoseSky}>
            <stop stopColor="hsl(var(--home-rose))" stopOpacity=".22" />
            <stop offset="1" stopColor="hsl(var(--home-rose))" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  if (variant === "cta") {
    return (
      <svg
        viewBox="0 0 1440 400"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        className="h-full w-full"
        aria-hidden
      >
        <path
          d="M-20 300 C 200 200,450 280,700 220 S 1100 260,1460 200"
          stroke="hsl(var(--home-amethyst) / 0.15)"
          strokeWidth="1"
          id={pathA}
        />
        <path
          d="M-20 100 C 300 180,600 80,900 150 S 1200 100,1460 130"
          stroke="hsl(var(--home-rose) / 0.1)"
          strokeWidth="1"
        />
        <circle r="2.5" fill="hsl(var(--home-amethyst))" opacity=".5">
          <animateMotion dur="10s" repeatCount="indefinite">
            <mpath href={`#${pathA}`} />
          </animateMotion>
        </circle>
        <circle cx="300" cy="250" r="3" fill="hsl(var(--home-amethyst))">
          <animate
            attributeName="opacity"
            values=".1;.4;.1"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="700" cy="150" r="3" fill="hsl(var(--home-rose))">
          <animate
            attributeName="opacity"
            values=".08;.35;.08"
            dur="4s"
            repeatCount="indefinite"
            begin="1s"
          />
        </circle>
        <circle cx="1100" cy="220" r="3" fill="hsl(var(--home-sky))">
          <animate
            attributeName="opacity"
            values=".08;.3;.08"
            dur="3.5s"
            repeatCount="indefinite"
            begin="2s"
          />
        </circle>
      </svg>
    );
  }

  // default — same family as HeroBackgroundSvg but fewer paths / particles
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 600"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <path
        d="M-20 420 C 200 280,400 360,600 310 S 1000 220,1460 280"
        stroke={`url(#${gradAmethystRose})`}
        strokeWidth="1.5"
        opacity=".18"
        id={pathA}
      />
      <path
        d="M-20 160 C 250 240,450 140,700 190 S 1050 160,1460 170"
        stroke={`url(#${gradRoseSky})`}
        strokeWidth="1.5"
        opacity=".16"
        id={pathB}
      />
      <circle r="3" fill="hsl(var(--home-amethyst))" opacity=".4">
        <animateMotion dur="8s" repeatCount="indefinite">
          <mpath href={`#${pathA}`} />
        </animateMotion>
      </circle>
      <circle r="2.5" fill="hsl(var(--home-rose))" opacity=".35">
        <animateMotion dur="10s" repeatCount="indefinite">
          <mpath href={`#${pathB}`} />
        </animateMotion>
      </circle>
      <circle cx="140" cy="130" r="3.5" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".1;.3;.1"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="1200" cy="180" r="4" fill="hsl(var(--home-rose))">
        <animate
          attributeName="opacity"
          values=".08;.25;.08"
          dur="4s"
          repeatCount="indefinite"
          begin=".5s"
        />
      </circle>
      <circle cx="700" cy="420" r="4" fill="hsl(var(--home-sky))">
        <animate
          attributeName="opacity"
          values=".06;.22;.06"
          dur="4.5s"
          repeatCount="indefinite"
          begin="1s"
        />
      </circle>
      <defs>
        <linearGradient id={gradAmethystRose} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="hsl(var(--home-amethyst))" />
          <stop offset="1" stopColor="hsl(var(--home-rose))" />
        </linearGradient>
        <linearGradient id={gradRoseSky} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="hsl(var(--home-rose))" />
          <stop offset="1" stopColor="hsl(var(--home-sky))" />
        </linearGradient>
      </defs>
    </svg>
  );
}
