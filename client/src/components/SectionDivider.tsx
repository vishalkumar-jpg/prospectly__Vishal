const SectionDivider = () => {
  return (
    <div className="relative py-6 lg:py-10 overflow-hidden">
      {/* Enhanced gradient background with purple */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-accent/5"></div>

      {/* Geometric pattern with purple accents */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-32 h-32 border border-purple-500/10 rounded-full"></div>
        <div className="absolute inset-4 border border-primary/20 rounded-full"></div>
        <div className="absolute inset-8 border border-purple-500/30 rounded-full"></div>
      </div>
    </div>
  );
};

export default SectionDivider;
