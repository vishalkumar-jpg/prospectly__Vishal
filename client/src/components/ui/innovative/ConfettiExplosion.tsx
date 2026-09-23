import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
}

interface ConfettiExplosionProps {
  isActive: boolean;
  duration?: number;
  particleCount?: number;
  className?: string;
  onComplete?: () => void;
}

const colors = [
  "bg-amber-400",
  "bg-orange-400",
  "bg-emerald-400",
  "bg-blue-400",
  "bg-purple-400",
  "bg-pink-400",
  "bg-yellow-400",
];

export function ConfettiExplosion({
  isActive,
  duration = 2000,
  particleCount = 30,
  className,
  onComplete,
}: ConfettiExplosionProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = Array.from(
        { length: particleCount },
        (_, i) => ({
          id: i,
          x: Math.random() * 200 - 100, // -100 to 100
          y: Math.random() * -200 - 50, // -50 to -250 (upward)
          rotation: Math.random() * 720 - 360,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          delay: Math.random() * 200,
        })
      );

      setPieces(newPieces);
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, duration, particleCount, onComplete]);

  if (!isVisible || pieces.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none overflow-hidden",
        className
      )}
    >
      <div className="relative w-full h-full">
        {pieces.map((piece) => (
          <div
            key={piece.id}
            className={cn("absolute left-1/2 top-1/2 rounded-sm", piece.color)}
            style={
              {
                width: piece.size,
                height: piece.size * 0.6,
                animation: `confetti-fall ${duration}ms ease-out forwards`,
                animationDelay: `${piece.delay}ms`,
                "--confetti-x": `${piece.x}px`,
                "--confetti-y": `${piece.y}px`,
                "--confetti-rotation": `${piece.rotation}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Inline keyframes for confetti animation */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(-50%, -50%) translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%)
              translateY(var(--confetti-y))
              translateX(var(--confetti-x))
              rotate(var(--confetti-rotation));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
