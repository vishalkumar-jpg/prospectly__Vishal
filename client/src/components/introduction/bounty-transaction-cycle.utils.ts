import type {
  PaymentCycle,
  PaymentEvent,
} from "@/hooks/useTransactionHistory";

export interface GroupedPaymentCycle {
  transactionId: string;
  cycleNumber: number;
  isActive: boolean;
  authorizedAt: string | null;
  events: PaymentEvent[];
}

export function groupPaymentEventsByCycle(
  events: PaymentEvent[],
  paymentCycles: PaymentCycle[]
): { cycles: GroupedPaymentCycle[]; otherEvents: PaymentEvent[] } {
  const cycleMap = new Map(paymentCycles.map((cycle) => [cycle.transactionId, cycle]));
  const cycles: GroupedPaymentCycle[] = [];
  const otherEvents: PaymentEvent[] = [];
  const eventsByTransaction = new Map<string, PaymentEvent[]>();

  for (const event of events) {
    if (!event.transactionId) {
      otherEvents.push(event);
      continue;
    }

    const existing = eventsByTransaction.get(event.transactionId) || [];
    existing.push(event);
    eventsByTransaction.set(event.transactionId, existing);
  }

  for (const cycle of paymentCycles) {
    const cycleEvents = eventsByTransaction.get(cycle.transactionId);
    if (!cycleEvents?.length) continue;

    cycles.push({
      transactionId: cycle.transactionId,
      cycleNumber: cycle.cycleNumber,
      isActive: cycle.isActive,
      authorizedAt: cycle.authorizedAt,
      events: cycleEvents,
    });
  }

  let nextFallbackCycleNumber = Math.max(
    0,
    ...paymentCycles.map((cycle) => cycle.cycleNumber),
    ...cycles.map((cycle) => cycle.cycleNumber),
  );

  for (const [transactionId, cycleEvents] of eventsByTransaction) {
    if (cycleMap.has(transactionId)) continue;
    nextFallbackCycleNumber += 1;
    cycles.push({
      transactionId,
      cycleNumber: nextFallbackCycleNumber,
      isActive: false,
      authorizedAt:
        cycleEvents.find((event) => event.type === "authorization")?.timestamp ||
        null,
      events: cycleEvents,
    });
  }

  return { cycles, otherEvents };
}
