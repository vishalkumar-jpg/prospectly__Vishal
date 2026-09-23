import { DollarSign, Trophy, TrendingUp, Activity } from "lucide-react";
import { BountyList } from "./BountyList";

export const AppPreview = () => {
  return (
    <div className="hidden md:flex items-center justify-center relative w-full h-full min-h-[600px]">
      {/* Decorative Background Elements that tie both sides */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[80%] bg-gradient-to-br from-primary/5 to-purple-600/5 blur-3xl rounded-full -z-10" />

      {/* Browser / App Frame */}
      <div className="relative w-full translate-x-12 lg:translate-x-20 animate-in slide-in-from-right duration-1000">
        {/* The "Window" - Attached to the layout edge */}
        <div className="bg-card/40 backdrop-blur-2xl border border-border/40 rounded-l-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border-r-0 h-[650px] flex flex-col">
          {/* App Header/Toolbar */}
          <div className="h-16 border-b border-border/20 px-8 flex items-center justify-between bg-muted/20">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400/20" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/20" />
              <div className="w-3 h-3 rounded-full bg-green-400/20" />
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10" />
          </div>

          {/* Window Content */}
          <div className="p-10 flex-1 flex flex-col space-y-8 overflow-hidden">
            {/* Summary Stats Row */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-tight text-foreground">
                  Income Dashboard
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Your network performance this month
                </p>
              </div>
              <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-2xl border border-emerald-500/20 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-bold">Active</span>
              </div>
            </div>

            {/* Top Line Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-background/60 border border-border/20 rounded-3xl group hover:border-primary/40 transition-all duration-300">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Total Network Value
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black">$45,280</span>
                  <span className="text-primary text-xs font-bold mb-1.5 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
                  </span>
                </div>
              </div>
              <div className="p-6 bg-background/60 border border-border/20 rounded-3xl group hover:border-primary/40 transition-all duration-300">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Avg. Referral Payout
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black">$1,450</span>
                  <div className="flex -space-x-2 ml-2 mb-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full bg-muted border-2 border-background overflow-hidden"
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`}
                          alt="user"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Opportunities List */}
            <BountyList />
          </div>

          {/* Footer / Status Bar */}
          <div className="p-6 bg-muted/10 border-t border-border/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-card bg-muted overflow-hidden"
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=connector${i}`}
                      alt="connector"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground">
                <span className="text-foreground">24 connectors</span> currently
                online
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                Live Syncing
              </span>
            </div>
          </div>
        </div>

        {/* Floating Micro-Interactions that ground the UI */}
        <div className="absolute top-[20%] -left-16 p-4 bg-background rounded-2xl shadow-xl border border-border/50 animate-float">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black">Top 1% Rank</p>
              <p className="text-[10px] text-muted-foreground font-medium">
                Connector Status
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-[15%] -left-12 p-4 bg-background rounded-2xl shadow-xl border border-border/50 animate-float animation-delay-2000">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black">+$1,250.00</p>
              <p className="text-[10px] text-muted-foreground font-medium">
                Referral Payout Received
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
