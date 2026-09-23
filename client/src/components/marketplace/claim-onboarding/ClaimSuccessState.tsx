import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles } from "lucide-react";
import { ConfettiExplosion, AnimatedCounter } from "@/components/ui/innovative";
import type { ClaimDealInfo } from "./types";

interface ClaimSuccessStateProps {
  dealInfo: ClaimDealInfo;
  onClose: () => void;
}

export function ClaimSuccessState({
  dealInfo,
  onClose,
}: ClaimSuccessStateProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti on mount
    setShowConfetti(true);
  }, []);

  return (
    <div className="relative text-center py-6 overflow-hidden">
      {/* Confetti celebration */}
      <ConfettiExplosion
        isActive={showConfetti}
        particleCount={40}
        duration={2500}
        onComplete={() => setShowConfetti(false)}
      />

      <div className="relative mx-auto w-20 h-20 mb-4">
        <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-50 animate-pulse" />
        <div className="relative w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
          <Trophy className="h-10 w-10 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-green-600 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
        Introduction Claimed Successfully!
      </h3>
      <p className="text-muted-foreground mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
        You can now make the introduction to {dealInfo.prospectName}
      </p>

      {/* Animated earnings display */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
        <p className="text-sm text-emerald-600 mb-1">Your potential earnings</p>
        <AnimatedCounter
          value={dealInfo.claimerShare}
          prefix="$"
          duration={1500}
          className="text-3xl text-emerald-700"
        />
      </div>

      <Button
        className="bg-green-600 hover:bg-green-700 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500"
        onClick={onClose}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Start Introduction
      </Button>
    </div>
  );
}
