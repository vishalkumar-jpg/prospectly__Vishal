import { useState, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Share2 } from "lucide-react";

interface SwipeCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  upLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function SwipeCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  leftLabel = "Skip",
  rightLabel = "Interested",
  upLabel = "Share",
  disabled = false,
  className,
}: SwipeCardProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState<"left" | "right" | "up" | null>(
    null
  );
  const startPos = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const threshold = 100;

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled) return;
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || disabled) return;

    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;

    setPosition({ x: deltaX, y: Math.min(0, deltaY) });

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setDirection(
        deltaX > threshold ? "right" : deltaX < -threshold ? "left" : null
      );
    } else if (deltaY < -threshold) {
      setDirection("up");
    } else {
      setDirection(null);
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (direction === "right" && onSwipeRight) {
      onSwipeRight();
    } else if (direction === "left" && onSwipeLeft) {
      onSwipeLeft();
    } else if (direction === "up" && onSwipeUp) {
      onSwipeUp();
    }

    setPosition({ x: 0, y: 0 });
    setDirection(null);
  };

  const rotation = position.x * 0.1;
  const opacity = Math.max(0, 1 - Math.abs(position.x) / 300);

  return (
    <div className={cn("relative touch-none select-none", className)}>
      {/* Action indicators */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Right indicator */}
        <div
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-full",
            "bg-emerald-500 text-white font-semibold transition-opacity duration-200",
            direction === "right" ? "opacity-100" : "opacity-0"
          )}
        >
          <Check className="h-5 w-5" />
          {rightLabel}
        </div>

        {/* Left indicator */}
        <div
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-full",
            "bg-slate-500 text-white font-semibold transition-opacity duration-200",
            direction === "left" ? "opacity-100" : "opacity-0"
          )}
        >
          <X className="h-5 w-5" />
          {leftLabel}
        </div>

        {/* Up indicator */}
        <div
          className={cn(
            "absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full",
            "bg-purple-500 text-white font-semibold transition-opacity duration-200",
            direction === "up" ? "opacity-100" : "opacity-0"
          )}
        >
          <Share2 className="h-5 w-5" />
          {upLabel}
        </div>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className={cn(
          "cursor-grab active:cursor-grabbing",
          isDragging ? "" : "transition-transform duration-300"
        )}
        style={{
          transform: `translateX(${position.x}px) translateY(${position.y}px) rotate(${rotation}deg)`,
          opacity,
        }}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) =>
          handleStart(e.touches[0].clientX, e.touches[0].clientY)
        }
        onTouchMove={(e) =>
          handleMove(e.touches[0].clientX, e.touches[0].clientY)
        }
        onTouchEnd={handleEnd}
      >
        {children}
      </div>
    </div>
  );
}
