import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Wallet } from "lucide-react";

/**
 * Shared status badge for finance views (overview, recruitment).
 * Supports: completed, pending, processing, held, filled, active.
 */
export function getFinanceStatusBadge(status: string): React.ReactNode {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 hover:bg-green-700 hover:text-green-50 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 hover:bg-amber-700 hover:text-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
        >
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "processing":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-blue-50 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
        >
          Processing
        </Badge>
      );
    case "held":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-blue-50 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
        >
          <Wallet className="h-3 w-3 mr-1" />
          In Escrow
        </Badge>
      );
    case "filled":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 hover:bg-green-700 hover:text-green-50 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
        >
          Filled
        </Badge>
      );
    case "active":
      return (
        <Badge
          variant="outline"
          className="bg-teal-50 text-teal-700 hover:bg-teal-700 hover:text-teal-50 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800"
        >
          Active
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
