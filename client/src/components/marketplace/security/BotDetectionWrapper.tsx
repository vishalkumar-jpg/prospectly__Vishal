import { useEffect, useRef, useState, type ReactNode } from "react";

interface BotDetectionMetrics {
  hasMouseMovement: boolean;
  hasKeyboardInput: boolean;
  hasScrolled: boolean;
  timeOnPage: number;
  formInteractionTime: number;
  isLikelyBot: boolean;
}

interface BotDetectionWrapperProps {
  children: ReactNode;
  minTimeOnPage?: number; // Minimum ms before allowing submission
  onMetricsUpdate?: (metrics: BotDetectionMetrics) => void;
  onBotDetected?: () => void;
}

/**
 * Wrapper component that tracks user behavior to detect bots.
 * Monitors mouse movement, keyboard input, scroll, and timing.
 */
export function BotDetectionWrapper({
  children,
  minTimeOnPage = 3000,
  onMetricsUpdate,
  onBotDetected,
}: BotDetectionWrapperProps) {
  const mountTime = useRef(Date.now());
  const firstInteraction = useRef<number | null>(null);
  const [metrics, setMetrics] = useState<BotDetectionMetrics>({
    hasMouseMovement: false,
    hasKeyboardInput: false,
    hasScrolled: false,
    timeOnPage: 0,
    formInteractionTime: 0,
    isLikelyBot: true,
  });

  useEffect(() => {
    const updateMetrics = (updates: Partial<BotDetectionMetrics>) => {
      setMetrics((prev) => {
        const newMetrics = { ...prev, ...updates };

        // Calculate if likely bot
        const timeOnPage = Date.now() - mountTime.current;
        const hasHumanBehavior =
          newMetrics.hasMouseMovement ||
          newMetrics.hasKeyboardInput ||
          newMetrics.hasScrolled;
        const hasMinimumTime = timeOnPage >= minTimeOnPage;

        newMetrics.timeOnPage = timeOnPage;
        newMetrics.isLikelyBot = !hasHumanBehavior || !hasMinimumTime;

        onMetricsUpdate?.(newMetrics);

        return newMetrics;
      });
    };

    const handleMouseMove = () => {
      if (!firstInteraction.current) {
        firstInteraction.current = Date.now();
      }
      updateMetrics({
        hasMouseMovement: true,
        formInteractionTime: Date.now() - mountTime.current,
      });
    };

    const handleKeyDown = () => {
      if (!firstInteraction.current) {
        firstInteraction.current = Date.now();
      }
      updateMetrics({
        hasKeyboardInput: true,
        formInteractionTime: Date.now() - mountTime.current,
      });
    };

    const handleScroll = () => {
      updateMetrics({ hasScrolled: true });
    };

    // Add listeners
    document.addEventListener("mousemove", handleMouseMove, { once: true });
    document.addEventListener("keydown", handleKeyDown, { once: true });
    window.addEventListener("scroll", handleScroll, { once: true });

    // Time tracking
    const timeInterval = setInterval(() => {
      const timeOnPage = Date.now() - mountTime.current;
      updateMetrics({ timeOnPage });
    }, 1000);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
      clearInterval(timeInterval);
    };
  }, [minTimeOnPage, onMetricsUpdate]);

  // Detect if behavior indicates bot on submission attempt
  useEffect(() => {
    if (metrics.isLikelyBot && metrics.timeOnPage > 1000) {
      // Give some time before flagging
      const timeSinceMount = Date.now() - mountTime.current;
      if (timeSinceMount < 500 && !metrics.hasMouseMovement) {
        onBotDetected?.();
      }
    }
  }, [metrics, onBotDetected]);

  return <>{children}</>;
}

/**
 * Hook to get bot detection metrics.
 */
export function useBotDetection(minTimeOnPage = 3000) {
  const mountTime = useRef(Date.now());
  const [metrics, setMetrics] = useState<BotDetectionMetrics>({
    hasMouseMovement: false,
    hasKeyboardInput: false,
    hasScrolled: false,
    timeOnPage: 0,
    formInteractionTime: 0,
    isLikelyBot: true,
  });

  useEffect(() => {
    let hasMouseMovement = false;
    let hasKeyboardInput = false;
    let hasScrolled = false;

    const checkMetrics = () => {
      const timeOnPage = Date.now() - mountTime.current;
      const hasHumanBehavior =
        hasMouseMovement || hasKeyboardInput || hasScrolled;
      const hasMinimumTime = timeOnPage >= minTimeOnPage;

      setMetrics({
        hasMouseMovement,
        hasKeyboardInput,
        hasScrolled,
        timeOnPage,
        formInteractionTime: timeOnPage,
        isLikelyBot: !hasHumanBehavior || !hasMinimumTime,
      });
    };

    const onMouse = () => {
      hasMouseMovement = true;
      checkMetrics();
    };
    const onKey = () => {
      hasKeyboardInput = true;
      checkMetrics();
    };
    const onScroll = () => {
      hasScrolled = true;
      checkMetrics();
    };

    document.addEventListener("mousemove", onMouse, { once: true });
    document.addEventListener("keydown", onKey, { once: true });
    window.addEventListener("scroll", onScroll, { once: true });

    const interval = setInterval(checkMetrics, 1000);

    return () => {
      document.removeEventListener("mousemove", onMouse);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      clearInterval(interval);
    };
  }, [minTimeOnPage]);

  return metrics;
}
