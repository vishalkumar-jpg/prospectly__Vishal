import { useId } from "react";

export function CtaBgSvg() {
  const uid = useId().replace(/:/g, "");
  const p1 = `ctap1-${uid}`;

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
        id={p1}
      />
      <path
        d="M-20 100 C 300 180,600 80,900 150 S 1200 100,1460 130"
        stroke="hsl(var(--home-rose) / 0.1)"
        strokeWidth="1"
      />
      <path
        d="M-20 350 C 400 280,800 360,1460 300"
        stroke="hsl(var(--home-sky) / 0.08)"
        strokeWidth=".8"
      />
      <circle r="2.5" fill="hsl(var(--home-amethyst))" opacity=".5">
        <animateMotion dur="10s" repeatCount="indefinite">
          <mpath href={`#${p1}`} />
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
      <circle cx="500" cy="320" r="2" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".05;.2;.05"
          dur="4s"
          repeatCount="indefinite"
          begin=".5s"
        />
      </circle>
      <circle cx="900" cy="100" r="2" fill="hsl(var(--home-rose))">
        <animate
          attributeName="opacity"
          values=".05;.2;.05"
          dur="3s"
          repeatCount="indefinite"
          begin="1.5s"
        />
      </circle>
    </svg>
  );
}
