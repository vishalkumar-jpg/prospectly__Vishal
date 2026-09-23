const brands = [
  "TechFlow",
  "DataSync",
  "CloudVault",
  "ConnectPro",
  "NetworkHub",
  "GrowthLab",
];

export function TrustedLogos() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5 border-y border-home-border px-5 py-4 md:gap-10 md:px-10">
      <span className="shrink-0 text-[11px] text-home-muted">
        Trusted by professionals from
      </span>
      {brands.map((name) => (
        <span
          key={name}
          className="text-[15px] font-bold tracking-[-0.2px] text-home-fg/50"
        >
          {name}
        </span>
      ))}
      <div className="ml-auto flex shrink-0 flex-wrap items-center gap-4">
        <div className="flex items-center gap-1 text-[11px] text-home-muted">
          <span className="h-1 w-1 shrink-0 rounded-full bg-home-trust-green" />
          <span>
            <b className="text-home-fg">25,000+</b> active members
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-home-muted">
          <span className="h-1 w-1 shrink-0 rounded-full bg-home-trust-green" />
          <span>
            <b className="text-home-fg">101</b> countries
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-home-muted">
          <span className="h-1 w-1 shrink-0 rounded-full bg-home-trust-green" />
          <span>
            <b className="text-home-fg">98%</b> intro success
          </span>
        </div>
      </div>
    </div>
  );
}
