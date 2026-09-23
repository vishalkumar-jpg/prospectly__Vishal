import { Zap, Trophy, Handshake, Send, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const ACTIONS = [
  {
    to: "/prospecting/opportunities",
    icon: Trophy,
    tint: "bg-brand-warning/10 text-brand-warning",
    title: "Browse Marketplace",
    desc: "Find high-value opportunities",
  },
  {
    to: "/prospecting/incoming-requests",
    icon: Handshake,
    tint: "bg-brand-success/10 text-brand-success",
    title: "Make Introduction",
    desc: "Connect your network",
  },
  {
    to: "/prospecting/find-prospects",
    icon: Send,
    tint: "bg-brand-rose/10 text-brand-rose",
    title: "Request Introduction",
    desc: "Get connected",
  },
];

export function QuickActionsCard() {
  return (
    <Card className="rounded-2xl border border-border bg-card shadow-brand-card">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
            <Zap className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg font-bold tracking-tight">
            Quick Actions
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 px-3 pt-0 sm:grid-cols-2 md:px-6">
        {ACTIONS.map((action, index) => (
          <Link
            key={action.to}
            to={action.to}
            className={`group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-gradient-to-b from-secondary/60 to-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-brand-card sm:gap-4 sm:p-4 ${
              index === ACTIONS.length - 1 ? "sm:col-span-2" : ""
            }`}
          >
            <div
              className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl ${action.tint}`}
            >
              <action.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {action.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {action.desc}
              </p>
            </div>
            <ChevronRight className="h-[18px] w-[18px] flex-shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-brand-rose" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
