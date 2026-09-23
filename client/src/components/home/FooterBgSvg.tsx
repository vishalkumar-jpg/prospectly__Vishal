export function FooterBgSvg() {
  return (
    <svg
      viewBox="0 0 1440 300"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      className="h-full w-full"
      aria-hidden
    >
      <path
        d="M-20 200 C 300 140,600 220,900 170 S 1200 200,1460 160"
        stroke="hsl(var(--home-amethyst) / 0.08)"
        strokeWidth=".8"
      />
      <path
        d="M-20 80 C 400 130,800 60,1460 100"
        stroke="hsl(var(--home-rose) / 0.05)"
        strokeWidth=".6"
      />
      <circle cx="200" cy="180" r="2" fill="hsl(var(--home-amethyst))">
        <animate
          attributeName="opacity"
          values=".05;.2;.05"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="700" cy="120" r="2" fill="hsl(var(--home-rose))">
        <animate
          attributeName="opacity"
          values=".04;.18;.04"
          dur="3.5s"
          repeatCount="indefinite"
          begin="1s"
        />
      </circle>
      <circle cx="1200" cy="170" r="2" fill="hsl(var(--home-sky))">
        <animate
          attributeName="opacity"
          values=".04;.15;.04"
          dur="4s"
          repeatCount="indefinite"
          begin="2s"
        />
      </circle>
    </svg>
  );
}
