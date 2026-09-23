import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Archive,
  Building,
  Calendar,
  Coins,
  CreditCard,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_PILL =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border-transparent";

const STATUS_VARIANTS: Record<string, { label: string; className: string }> = {
  captured: {
    label: "Payment Captured",
    className: `${STATUS_PILL} bg-brand-success/15 text-brand-success`,
  },
  completed: {
    label: "Completed",
    className: `${STATUS_PILL} bg-brand-success/15 text-brand-success`,
  },
  succeeded: {
    label: "Succeeded",
    className: `${STATUS_PILL} bg-brand-success/15 text-brand-success`,
  },
  pending: {
    label: "Pending",
    className: `${STATUS_PILL} bg-brand-warning/15 text-brand-warning`,
  },
  failed: {
    label: "Failed",
    className: `${STATUS_PILL} bg-destructive/15 text-destructive`,
  },
  refunded: {
    label: "Refunded",
    className: `${STATUS_PILL} bg-brand-sky/15 text-brand-sky`,
  },
  refund_initiated: {
    label: "Refund Processing",
    className: `${STATUS_PILL} bg-brand-sky/15 text-brand-sky`,
  },
  refund_failed: {
    label: "Refund Failed",
    className: `${STATUS_PILL} bg-destructive/15 text-destructive`,
  },
  voided: {
    label: "Released",
    className: `${STATUS_PILL} bg-muted text-muted-foreground`,
  },
};

export function getStatusBadge(status: string | null) {
  const variant = STATUS_VARIANTS[status || "pending"] || STATUS_VARIANTS.pending;
  return <Badge className={variant.className}>{variant.label}</Badge>;
}

function getEventVisual(type: string) {
  switch (type) {
    case "authorization":
      return { Icon: CreditCard, tone: "text-primary", bg: "bg-primary/10" };
    case "requester_withdrawal":
      return { Icon: Archive, tone: "text-muted-foreground", bg: "bg-muted" };
    case "initial_capture":
      return { Icon: Mail, tone: "text-brand-rose", bg: "bg-brand-rose/10" };
    case "remaining_capture":
      return {
        Icon: Calendar,
        tone: "text-brand-success",
        bg: "bg-brand-success/10",
      };
    case "transfer":
      return {
        Icon: ArrowRight,
        tone: "text-brand-warning",
        bg: "bg-brand-warning/10",
      };
    case "payout":
      return {
        Icon: Building,
        tone: "text-brand-success",
        bg: "bg-brand-success/10",
      };
    default:
      return { Icon: Coins, tone: "text-muted-foreground", bg: "bg-muted" };
  }
}

export function getEventIconSquare(type: string) {
  const { Icon, tone, bg } = getEventVisual(type);
  return (
    <span
      className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", bg)}
    >
      <Icon className={cn("h-4 w-4", tone)} />
    </span>
  );
}

export function getPaymentEventLabel(type: string) {
  if (type === "requester_withdrawal") {
    return "Introduction withdrawn";
  }
  return type.replace(/_/g, " ");
}

export function formatCurrency(amount: number | null) {
  if (amount === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatTimelineAmount(type: string, amount: number | null) {
  if (type === "requester_withdrawal" && (amount === null || amount === 0)) {
    return "—";
  }
  return formatCurrency(amount);
}
