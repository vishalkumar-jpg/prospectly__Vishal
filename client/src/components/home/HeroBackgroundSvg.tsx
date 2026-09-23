import { useId } from "react";

export function HeroBackgroundSvg() {
  const uid = useId().replace(/:/g, "");
  const hg1 = `hg1-${uid}`;
  const hg2 = `hg2-${uid}`;
  const hg3 = `hg3-${uid}`;
  const path1 = `path1-${uid}`;
  const path2 = `path2-${uid}`;
  const path3 = `path3-${uid}`;
  const path4 = `path4-${uid}`;

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
        stroke={`url(#${hg1})`}
        strokeWidth="1.5"
        opacity=".18"
        id={path1}
      />
      <path
        d="M-20 160 C 250 240,450 140,700 190 S 1050 160,1460 170"
        stroke={`url(#${hg2})`}
        strokeWidth="1.5"
        opacity=".16"
        id={path2}
      />
      <path
        d="M-20 300 C 300 210,550 290,800 240 S 1100 280,1460 230"
        stroke={`url(#${hg1})`}
        strokeWidth="1"
        opacity=".12"
        id={path3}
      />
      <path
        d="M-20 80 C 350 140,700 60,1050 110 S 1300 80,1460 90"
        stroke={`url(#${hg3})`}
        strokeWidth="1"
        opacity=".1"
        id={path4}
      />
      <path
        d="M-20 510 C 280 460,560 530,840 480 S 1200 510,1460 470"
        stroke={`url(#${hg2})`}
        strokeWidth=".8"
        opacity=".08"
      />
      <circle r="3" fill="hsl(var(--home-amethyst))" opacity=".4">
        <animateMotion dur="8s" repeatCount="indefinite">
          <mpath href={`#${path1}`} />
        </animateMotion>
      </circle>
      <circle r="2.5" fill="hsl(var(--home-rose))" opacity=".35">
        <animateMotion dur="10s" repeatCount="indefinite">
          <mpath href={`#${path2}`} />
        </animateMotion>
      </circle>
      <circle r="2" fill="hsl(var(--home-sky))" opacity=".3">
        <animateMotion dur="12s" repeatCount="indefinite">
          <mpath href={`#${path3}`} />
        </animateMotion>
      </circle>
      <circle r="2" fill="hsl(var(--home-amethyst))" opacity=".25">
        <animateMotion dur="14s" repeatCount="indefinite">
          <mpath href={`#${path4}`} />
        </animateMotion>
      </circle>
      <line
        x1="140"
        y1="130"
        x2="380"
        y2="340"
        stroke="hsl(var(--home-amethyst))"
        strokeWidth=".7"
        opacity=".08"
      />
      <line
        x1="520"
        y1="100"
        x2="700"
        y2="310"
        stroke="hsl(var(--home-rose))"
        strokeWidth=".7"
        opacity=".06"
      />
      <circle cx="140" cy="130" r="3.5" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".1;.3;.1"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="380" cy="340" r="4" fill="hsl(var(--home-rose))">
        <animate
          attributeName="opacity"
          values=".08;.25;.08"
          dur="4s"
          repeatCount="indefinite"
          begin=".5s"
        />
      </circle>
      <circle cx="600" cy="310" r="4.5" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".1;.28;.1"
          dur="3.5s"
          repeatCount="indefinite"
          begin="1s"
        />
      </circle>
      <circle cx="700" cy="190" r="4" fill="hsl(var(--home-sky))">
        <animate
          attributeName="opacity"
          values=".08;.25;.08"
          dur="4.5s"
          repeatCount="indefinite"
          begin="1.5s"
        />
      </circle>
      <circle cx="1050" cy="110" r="3.5" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".08;.22;.08"
          dur="3s"
          repeatCount="indefinite"
          begin="2s"
        />
      </circle>
      <circle cx="840" cy="240" r="5" fill="hsl(var(--home-rose))">
        <animate
          attributeName="opacity"
          values=".1;.3;.1"
          dur="5s"
          repeatCount="indefinite"
          begin=".8s"
        />
      </circle>
      <circle cx="80" cy="260" r="2" fill="hsl(var(--home-rose))">
        <animate
          attributeName="opacity"
          values=".08;.2;.08"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="260" cy="190" r="2" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".06;.18;.06"
          dur="4s"
          repeatCount="indefinite"
          begin=".3s"
        />
      </circle>
      <circle cx="460" cy="450" r="2" fill="hsl(var(--home-sky))">
        <animate
          attributeName="opacity"
          values=".05;.16;.05"
          dur="3.5s"
          repeatCount="indefinite"
          begin=".6s"
        />
      </circle>
      <circle cx="950" cy="390" r="2" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".06;.18;.06"
          dur="4s"
          repeatCount="indefinite"
          begin="1s"
        />
      </circle>
      <circle cx="1200" cy="180" r="2" fill="hsl(var(--home-rose))">
        <animate
          attributeName="opacity"
          values=".05;.16;.05"
          dur="3s"
          repeatCount="indefinite"
          begin="1.3s"
        />
      </circle>
      <circle cx="1350" cy="350" r="2" fill="hsl(var(--home-sky))">
        <animate
          attributeName="opacity"
          values=".04;.14;.04"
          dur="4.5s"
          repeatCount="indefinite"
          begin="1.6s"
        />
      </circle>
      <circle cx="320" cy="490" r="1.5" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".04;.12;.04"
          dur="3s"
          repeatCount="indefinite"
          begin="2s"
        />
      </circle>
      <defs>
        <linearGradient id={hg1} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="hsl(var(--home-amethyst))" />
          <stop offset="1" stopColor="hsl(var(--home-rose))" />
        </linearGradient>
        <linearGradient id={hg2} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="hsl(var(--home-rose))" />
          <stop offset="1" stopColor="hsl(var(--home-sky))" />
        </linearGradient>
        <linearGradient id={hg3} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="hsl(var(--home-sky))" />
          <stop offset="1" stopColor="hsl(var(--home-amethyst))" />
        </linearGradient>
      </defs>
    </svg>
  );
}
