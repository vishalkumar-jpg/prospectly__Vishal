import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, DollarSign, Calendar, User } from "lucide-react";
import { utcDayjs } from "@/lib/dayjs";
import type { IntroductionForDispute } from "@/types/dispute";

interface FileDisputeModalStep1Props {
  selectedIntroduction: string;
  onSelectIntroduction: (id: string) => void;
  roleFilter: "all" | "requester" | "connector";
  onRoleFilterChange: (filter: "all" | "requester" | "connector") => void;
  introductions: IntroductionForDispute[];
  onNext: () => void;
  onCancel: () => void;
}

export function FileDisputeModalStep1({
  selectedIntroduction,
  onSelectIntroduction,
  roleFilter,
  onRoleFilterChange,
  introductions,
  onNext,
  onCancel,
}: FileDisputeModalStep1Props) {
  const filteredIntroductions = introductions.filter((intro) => {
    if (roleFilter === "all") return true;
    return intro.userRole === roleFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={roleFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onRoleFilterChange("all")}
        >
          All
        </Button>
        <Button
          variant={roleFilter === "requester" ? "default" : "outline"}
          size="sm"
          onClick={() => onRoleFilterChange("requester")}
        >
          As Requester
        </Button>
        <Button
          variant={roleFilter === "connector" ? "default" : "outline"}
          size="sm"
          onClick={() => onRoleFilterChange("connector")}
        >
          As Connector
        </Button>
      </div>

      <RadioGroup
        value={selectedIntroduction}
        onValueChange={onSelectIntroduction}
      >
        <div className="space-y-3">
          {filteredIntroductions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No eligible introductions found. You can only dispute completed or
              paid introductions.
            </p>
          ) : (
            filteredIntroductions.map((intro) => (
              <Card key={intro.id} className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value={intro.id}
                    id={intro.id}
                    className="mt-1"
                  />
                  <label htmlFor={intro.id} className="flex-1 cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{intro.contactName}</h4>
                          <Badge
                            variant={
                              intro.userRole === "requester"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {intro.userRole === "requester"
                              ? "Requester"
                              : "Connector"}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3" />
                            <span>
                              Referral Payout: $
                              {Number(intro.bountyAmount).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {utcDayjs(intro.createdAt)
                                .local()
                                .format("MMM D, YYYY")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>
                              Duration: {intro.meetingDuration ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            intro.paymentStatus === "paid"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {intro.paymentStatus ?? "Unknown"}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {intro.status}
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </Card>
            ))
          )}
        </div>
      </RadioGroup>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onNext} disabled={!selectedIntroduction}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
