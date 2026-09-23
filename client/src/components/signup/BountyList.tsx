import { Button } from "@/components/ui/button";
import { Users, Zap, Target, Briefcase, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const payoutTone: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-500",
  purple: "bg-purple-500/10 text-purple-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
};

export const BountyList = () => {
  const payouts = [
    {
      title: "CTO @ Fintech Startup",
      payout: "$2,800",
      contacts: "12 mutuals",
      color: "blue",
    },
    {
      title: "VP Product @ AI Lab",
      payout: "$3,500",
      contacts: "8 mutuals",
      color: "purple",
    },
    {
      title: "Lead Designer @ Meta",
      payout: "$1,200",
      contacts: "24 mutuals",
      color: "emerald",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          Recommended PAYOUTS
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] font-bold h-6 uppercase px-2"
        >
          View All
        </Button>
      </div>

      {payouts.map((item, i) => (
        <div
          key={i}
          className={cn(
            "p-4 bg-background/40 border border-border/10 rounded-2xl flex items-center justify-between hover:translate-x-1 hover:bg-background/80 transition-all duration-300 group/item cursor-pointer"
          )}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                payoutTone[item.color]
              )}
            >
              {i === 0 ? (
                <Zap className="w-6 h-6" />
              ) : i === 1 ? (
                <Target className="w-6 h-6" />
              ) : (
                <Briefcase className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-tight tracking-tight">
                {item.title}
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Users className="w-3 h-3" /> {item.contacts}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-black text-primary tracking-tight leading-none">
                {item.payout}
              </p>
              <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter mt-1">
                Intro Referral Payout
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover/item:bg-primary group-hover/item:text-white transition-colors">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
