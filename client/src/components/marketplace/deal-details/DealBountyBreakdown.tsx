import { Send, Calendar, PartyPopper } from "lucide-react";

interface DealBountyBreakdownProps {
  bountyAmount: number;
}

export function DealBountyBreakdown({
  bountyAmount,
}: DealBountyBreakdownProps) {
  const breakdown = {
    introSent: Math.floor(bountyAmount * 0.2),
    meetingBooked: Math.floor(bountyAmount * 0.6),
    dealClosed: Math.floor(bountyAmount * 0.2),
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-4">
        How You Earn
      </p>

      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-500 text-white mx-auto mb-2 flex items-center justify-center shadow-lg shadow-emerald-200/50">
            <Send className="h-5 w-5" />
          </div>
          <p className="text-lg font-bold text-emerald-700">
            ${breakdown.introSent}
          </p>
          <p className="text-xs text-emerald-600 font-medium">Intro Sent</p>
        </div>

        <div className="flex-1 h-0.5 bg-emerald-200 mx-2 max-w-[60px]" />

        <div className="flex-1 text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-500 text-white mx-auto mb-2 flex items-center justify-center shadow-lg shadow-emerald-200/50">
            <Calendar className="h-5 w-5" />
          </div>
          <p className="text-lg font-bold text-emerald-700">
            ${breakdown.meetingBooked}
          </p>
          <p className="text-xs text-emerald-600 font-medium">Meeting Booked</p>
        </div>

        <div className="flex-1 h-0.5 bg-emerald-200 mx-2 max-w-[60px]" />

        <div className="flex-1 text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-500 text-white mx-auto mb-2 flex items-center justify-center shadow-lg shadow-emerald-200/50">
            <PartyPopper className="h-5 w-5" />
          </div>
          <p className="text-lg font-bold text-emerald-700">
            ${breakdown.dealClosed}
          </p>
          <p className="text-xs text-emerald-600 font-medium">Completed</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-emerald-200">
        <span className="font-semibold text-emerald-800">
          Total Referral Payout
        </span>
        <span className="text-xl font-bold text-emerald-700">
          ${bountyAmount}
        </span>
      </div>
    </div>
  );
}
