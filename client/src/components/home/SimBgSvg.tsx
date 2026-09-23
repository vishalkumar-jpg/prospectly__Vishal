import { useId } from "react";

export function SimBgSvg() {
  const uid = useId().replace(/:/g, "");
  const p1 = `simp1-${uid}`;

  return (
    <svg
      viewBox="0 0 1440 600"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      className="h-full w-full"
      aria-hidden
    >
      <path
        d="M-20 400 C 300 300,600 380,900 320 S 1200 360,1460 300"
        stroke="hsl(var(--home-amethyst) / 0.08)"
        strokeWidth="1"
        id={p1}
      />
      <path
        d="M-20 150 C 400 220,800 120,1460 180"
        stroke="hsl(var(--home-rose) / 0.05)"
        strokeWidth=".8"
      />
      <circle r="2" fill="hsl(var(--home-amethyst))" opacity=".4">
        <animateMotion dur="11s" repeatCount="indefinite">
          <mpath href={`#${p1}`} />
        </animateMotion>
      </circle>
      <circle cx="350" cy="350" r="2.5" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".05;.2;.05"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="800" cy="200" r="2" fill="hsl(var(--home-rose))">
        <animate
          attributeName="opacity"
          values=".04;.18;.04"
          dur="3.5s"
          repeatCount="indefinite"
          begin="1s"
        />
      </circle>
      <circle cx="1150" cy="320" r="2" fill="hsl(var(--home-sky))">
        <animate
          attributeName="opacity"
          values=".04;.18;.04"
          dur="4s"
          repeatCount="indefinite"
          begin="2s"
        />
      </circle>
    </svg>
  );
}
