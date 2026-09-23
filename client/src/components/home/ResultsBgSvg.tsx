import { useId } from "react";

export function ResultsBgSvg() {
  const uid = useId().replace(/:/g, "");
  const p1 = `resp1-${uid}`;

  return (
    <svg
      viewBox="0 0 1440 500"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      className="h-full w-full"
      aria-hidden
    >
      <path
        d="M-20 350 C 250 250,500 320,750 270 S 1100 300,1460 250"
        stroke="hsl(var(--home-amethyst) / 0.1)"
        strokeWidth="1"
        id={p1}
      />
      <path
        d="M-20 120 C 350 180,700 100,1050 160 S 1300 120,1460 140"
        stroke="hsl(var(--home-rose) / 0.06)"
        strokeWidth=".8"
      />
      <circle r="2.5" fill="hsl(var(--home-amethyst))" opacity=".4">
        <animateMotion dur="9s" repeatCount="indefinite">
          <mpath href={`#${p1}`} />
        </animateMotion>
      </circle>
      <circle cx="250" cy="300" r="2.5" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".05;.25;.05"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="600" cy="180" r="2" fill="hsl(var(--home-rose))">
        <animate
          attributeName="opacity"
          values=".04;.2;.04"
          dur="3.5s"
          repeatCount="indefinite"
          begin="1s"
        />
      </circle>
      <circle cx="1000" cy="280" r="2.5" fill="hsl(var(--home-sky))">
        <animate
          attributeName="opacity"
          values=".05;.22;.05"
          dur="4s"
          repeatCount="indefinite"
          begin="2s"
        />
      </circle>
      <circle cx="1300" cy="150" r="2" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".04;.18;.04"
          dur="3s"
          repeatCount="indefinite"
          begin=".5s"
        />
      </circle>
    </svg>
  );
}
