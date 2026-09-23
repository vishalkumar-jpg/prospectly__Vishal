import { Card, CardContent } from "@/components/ui/card";
import { CountryFilterMultiSelect } from "@/components/recruitment/CountryFilterMultiSelect";
import { DASHBOARD_FILTER_COMPACT_WIDTH_CLASS } from "./dashboardFilter.styles";

type RecruiterDashboardCountryBarProps = {
  countries: string[];
  onCountriesChange: (countries: string[]) => void;
};

export function RecruiterDashboardCountryBar({
  countries,
  onCountriesChange,
}: RecruiterDashboardCountryBarProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Viewing Data</p>
          <p className="text-xs text-muted-foreground">
            Every metric, action, and job on this dashboard reflects the
            selected region.
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:shrink-0">
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            Showing data for
          </span>
          <CountryFilterMultiSelect
            value={countries}
            onChange={onCountriesChange}
            className={DASHBOARD_FILTER_COMPACT_WIDTH_CLASS}
          />
        </div>
      </CardContent>
    </Card>
  );
}
