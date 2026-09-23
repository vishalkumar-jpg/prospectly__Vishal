import { cn } from "@/lib/utils";

interface GlassmorphicCardProps {
  children: React.ReactNode;
  variant?: "light" | "dark" | "gradient";
  blur?: "sm" | "md" | "lg";
  className?: string;
}

const blurConfig = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
};

const variantConfig = {
  light: "bg-white/70 border-white/50 shadow-lg",
  dark: "bg-slate-900/70 border-slate-700/50 shadow-xl text-white",
  gradient:
    "bg-gradient-to-br from-white/80 to-white/40 border-white/60 shadow-lg",
};

export function GlassmorphicCard({
  children,
  variant = "light",
  blur = "md",
  className,
}: GlassmorphicCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-6",
        blurConfig[blur],
        variantConfig[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
