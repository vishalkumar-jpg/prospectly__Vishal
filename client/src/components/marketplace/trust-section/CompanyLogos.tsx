import { Building2, Globe } from "lucide-react";

export function CompanyLogos() {
  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground mb-4">
        Trusted by professionals from leading companies
      </p>
      <div className="flex items-center justify-center gap-8 opacity-50">
        <Building2 className="h-8 w-8" />
        <Globe className="h-8 w-8" />
        <Building2 className="h-8 w-8" />
        <Globe className="h-8 w-8" />
        <Building2 className="h-8 w-8" />
      </div>
    </div>
  );
}
