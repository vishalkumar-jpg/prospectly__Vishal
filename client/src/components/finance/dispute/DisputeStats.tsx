import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dispute, DISPUTE_STATUS } from "@/types/dispute";
import { cn } from "@/lib/utils";

interface DisputeStatsProps {
  disputes: Dispute[];
}

export function DisputeStats({ disputes }: DisputeStatsProps) {
  const activeDisputes = disputes.filter(
    (d) =>
      d.status === DISPUTE_STATUS.PENDING ||
      d.status === DISPUTE_STATUS.UNDER_REVIEW
  ).length;
  const resolvedDisputes = disputes.filter(
    (d) => d.status === DISPUTE_STATUS.RESOLVED
  ).length;
  const rejectedDisputes = disputes.filter(
    (d) => d.status === DISPUTE_STATUS.REJECTED
  ).length;

  const stats = [
    {
      title: "Active Disputes",
      value: activeDisputes,
      icon: AlertCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Total Resolved",
      value: resolvedDisputes,
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Rejected",
      value: rejectedDisputes,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="bg-card text-card-foreground border border-border rounded-lg shadow-sm"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              </div>
              <div className={cn(stat.bgColor, "p-3 rounded-xl")}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
