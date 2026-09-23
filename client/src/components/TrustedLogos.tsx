const TrustedLogos = () => {
  const logos = [
    { name: "TechFlow", width: "120" },
    { name: "DataSync", width: "100" },
    { name: "CloudVault", width: "100" },
    { name: "ConnectPro", width: "130" },
    { name: "NetworkHub", width: "110" },
    { name: "GrowthLab", width: "110" },
  ];

  return (
    <section className="pt-3 pb-6 bg-background/50 backdrop-blur-sm border-y border-border/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground font-medium">
            Trusted by professionals from leading companies
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12 opacity-60 hover:opacity-80 transition-opacity duration-300">
          {logos.map((logo, index) => (
            <div
              key={index}
              className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300"
              style={{ minWidth: logo.width + "px" }}
            >
              <div className="h-8 flex items-center justify-center text-muted-foreground font-semibold text-lg">
                {logo.name}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              25,000+ active members
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              50+ countries
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              98% intro success rate
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustedLogos;
