import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

interface MarketplaceFiltersProps {
  bountyRange: number[];
  setBountyRange: (range: number[]) => void;
  urgencyFilter: string[];
  setUrgencyFilter: (filter: string[]) => void;
  onClearFilters: () => void;
}

export function MarketplaceFilters({
  bountyRange,
  setBountyRange,
  urgencyFilter,
  setUrgencyFilter,
  onClearFilters,
}: MarketplaceFiltersProps) {
  const toggleUrgency = (value: string, checked: boolean) => {
    if (checked) {
      setUrgencyFilter([...urgencyFilter, value]);
    } else {
      setUrgencyFilter(urgencyFilter.filter((u) => u !== value));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filters</h3>
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Clear All
        </Button>
      </div>

      {/* Bounty Range */}
      <div>
        <h4 className="font-semibold mb-3">Payout Amount</h4>
        <Slider
          min={100}
          max={2000}
          step={50}
          value={bountyRange}
          onValueChange={setBountyRange}
          className="mb-2"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>${bountyRange[0]}</span>
          <span>${bountyRange[1]}+</span>
        </div>
      </div>

      <Separator />

      {/* Urgency */}
      <div>
        <h4 className="font-semibold mb-3">Time Remaining</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="urgent"
              checked={urgencyFilter.includes("urgent")}
              onCheckedChange={(checked) => toggleUrgency("urgent", !!checked)}
            />
            <label htmlFor="urgent" className="text-sm cursor-pointer">
              Urgent (&lt; 3 days)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="soon"
              checked={urgencyFilter.includes("soon")}
              onCheckedChange={(checked) => toggleUrgency("soon", !!checked)}
            />
            <label htmlFor="soon" className="text-sm cursor-pointer">
              Ending Soon (3-7 days)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="flexible"
              checked={urgencyFilter.includes("flexible")}
              onCheckedChange={(checked) =>
                toggleUrgency("flexible", !!checked)
              }
            />
            <label htmlFor="flexible" className="text-sm cursor-pointer">
              Flexible (7+ days)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
