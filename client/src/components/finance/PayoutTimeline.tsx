import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toUTC } from "@/lib/dayjs";

interface PayoutEvent {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  amount: number;
  description: string;
  createdAt: string;
}

export function PayoutTimeline() {
  const { user } = useAuth();
  const [events, setEvents] = useState<PayoutEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchPayouts = async () => {
      try {
        // Use centralized API request which includes proactive token refresh
        const data = await api.finances.getPayoutTimeline();
        const timelineData = data.timeline || [];
        const payoutEvents: PayoutEvent[] = timelineData.map(
          (item: {
            id?: string;
            status?: string;
            amount?: number;
            description?: string;
            paidOutAt?: string;
            createdAt?: string;
          }) => ({
            id: item.id || "",
            status: (item.status as PayoutEvent["status"]) || "pending",
            amount: item.amount || 0,
            description: item.description || `Payout for introduction`,
            createdAt:
              item.paidOutAt || item.createdAt || toUTC().toISOString(),
          })
        );

        setEvents(payoutEvents);
      } catch {
        // Error is silently handled - component will show empty state
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "processing":
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="border border-border shadow-md bg-white">
        <CardHeader className="p-4 md:p-6">
          <CardTitle>Payout Timeline</CardTitle>
          <CardDescription>Track your earnings and payouts</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="text-center py-8 text-muted-foreground">
            Loading timeline...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border shadow-md bg-white">
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle className="mb-0">Payout Timeline</CardTitle>
        </div>
        <CardDescription>Track your earnings and payouts</CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No payouts yet
          </div>
        ) : (
          <div className="relative space-y-4">
            <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-border" />
            {events.map((event) => (
              <div key={event.id} className="relative flex gap-4 pb-4">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-background bg-card shadow-sm">
                  {getStatusIcon(event.status)}
                </div>
                <div className="flex-1 pt-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{event.description}</p>
                    <p className="font-bold text-green-600">
                      {formatCurrency(event.amount)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatLocalizedShortDateTime(event.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
