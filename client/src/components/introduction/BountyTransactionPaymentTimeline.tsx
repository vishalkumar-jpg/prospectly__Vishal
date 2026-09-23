import { Clock } from "lucide-react";
import type {
  PaymentCycle,
  PaymentEvent,
  UnsuccessfulAttempt,
} from "@/hooks/useTransactionHistory";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { Badge } from "@/components/ui/badge";
import { BountyTransactionUnsuccessfulNote } from "./BountyTransactionUnsuccessfulNote";
import { groupPaymentEventsByCycle } from "./bounty-transaction-cycle.utils";
import {
  formatTimelineAmount,
  getEventIconSquare,
  getPaymentEventLabel,
  getStatusBadge,
} from "./bounty-transaction-display.utils";

interface BountyTransactionPaymentTimelineProps {
  paymentEvents: PaymentEvent[];
  paymentCycles: PaymentCycle[];
  unsuccessfulAttempts: UnsuccessfulAttempt[];
  isRequester: boolean;
}

function PaymentEventTable({ events }: { events: PaymentEvent[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <table className="w-full" data-testid="table-payment-events">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Amount
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((event, index) => (
              <tr
                key={index}
                className="transition-colors hover:bg-muted/50"
                data-testid={`row-payment-event-${index}`}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-3">
                    {getEventIconSquare(event.type)}
                    <span className="text-sm font-medium capitalize">
                      {getPaymentEventLabel(event.type)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {event.description}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                  {event.timestamp ? (
                    formatLocalizedShortDateTime(event.timestamp)
                  ) : (
                    <span className="text-muted-foreground/50">Pending</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums">
                  {formatTimelineAmount(event.type, event.amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center">
                  {getStatusBadge(event.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {events.map((event, index) => (
          <div
            key={index}
            className="rounded-xl border bg-card p-4 shadow-sm"
            data-testid={`row-payment-event-${index}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {getEventIconSquare(event.type)}
                <span className="truncate text-sm font-medium capitalize">
                  {getPaymentEventLabel(event.type)}
                </span>
              </div>
              {getStatusBadge(event.status)}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {event.description}
            </p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {event.timestamp ? (
                  formatLocalizedShortDateTime(event.timestamp)
                ) : (
                  <span className="text-muted-foreground/50">Pending</span>
                )}
              </span>
              <span className="font-semibold tabular-nums">
                {formatTimelineAmount(event.type, event.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CycleHeader({
  cycleNumber,
  authorizedAt,
  isActive,
}: {
  cycleNumber: number;
  authorizedAt: string | null;
  isActive: boolean;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">Payment Cycle {cycleNumber}</span>
      {authorizedAt ? (
        <>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">
            Authorized {formatLocalizedShortDateTime(authorizedAt)}
          </span>
        </>
      ) : null}
      {isActive ? (
        <Badge className="bg-brand-success/15 text-brand-success">
          Current
        </Badge>
      ) : null}
    </div>
  );
}

export function BountyTransactionPaymentTimeline({
  paymentEvents,
  paymentCycles,
  unsuccessfulAttempts,
  isRequester,
}: BountyTransactionPaymentTimelineProps) {
  const filteredEvents = isRequester
    ? paymentEvents.filter(
        (event) => event.type !== "transfer" && event.type !== "payout"
      )
    : paymentEvents;

  const { cycles, otherEvents } = groupPaymentEventsByCycle(
    filteredEvents,
    paymentCycles
  );

  const hasCycles = cycles.length > 0;
  const showCycleHeaders = cycles.length > 1;

  return (
    <section className="rounded-2xl border border-brand-sky/15 bg-brand-sky/[0.05] p-5">
      <h3 className="mb-4 flex items-center gap-2.5 text-base font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-background text-brand-sky">
          <Clock className="h-4 w-4" />
        </span>
        Payment Timeline
      </h3>

      <BountyTransactionUnsuccessfulNote attempts={unsuccessfulAttempts} />

      {!hasCycles && otherEvents.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
          No payment events yet. Events will appear as the introduction
          progresses.
        </div>
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => (
            <div
              key={cycle.transactionId}
              className={
                showCycleHeaders
                  ? "rounded-xl border border-border/60 bg-card/50 p-4"
                  : undefined
              }
            >
              {showCycleHeaders ? (
                <CycleHeader
                  cycleNumber={cycle.cycleNumber}
                  authorizedAt={cycle.authorizedAt}
                  isActive={cycle.isActive}
                />
              ) : null}
              <PaymentEventTable events={cycle.events} />
            </div>
          ))}

          {otherEvents.length > 0 ? (
            <div className="rounded-xl border border-border/60 bg-card/50 p-4">
              {cycles.length > 0 ? (
                <p className="mb-3 text-sm font-semibold">Other Events</p>
              ) : null}
              <PaymentEventTable events={otherEvents} />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
