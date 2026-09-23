import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

const mockHistoricalDisputes = [
  {
    id: "DISP-050",
    type: "Payment Issue",
    amount: 25.0,
    status: "resolved",
    resolution: "Refunded",
    date: "2023-12-20",
  },
  {
    id: "DISP-049",
    type: "Service Quality",
    amount: 50.0,
    status: "resolved",
    resolution: "Credit issued",
    date: "2023-12-15",
  },
  {
    id: "DISP-048",
    type: "Duplicate Charge",
    amount: 100.0,
    status: "rejected",
    resolution: "No duplicate found",
    date: "2023-12-10",
  },
  {
    id: "DISP-047",
    type: "Billing Error",
    amount: 75.0,
    status: "resolved",
    resolution: "Corrected",
    date: "2023-12-05",
  },
];

export function DisputeHistory() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-600 via-gray-600 to-zinc-700 rounded-2xl shadow-2xl border border-white/20">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 via-transparent to-zinc-600/20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gray-400/20 rounded-full blur-2xl"></div>

        <div className="relative z-10 p-4 md:p-8">
          <div className="flex flex-col space-y-2">
            <h2 className="text-4xl font-bold text-white flex items-center gap-3">
              <CheckCircle className="h-10 w-10 text-white/90" />
              Dispute History
            </h2>
            <p className="text-white/90 text-lg">
              View all your past disputes and their resolutions
            </p>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Past Disputes</CardTitle>
          <CardDescription>All resolved and closed disputes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispute ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resolution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockHistoricalDisputes.map((dispute) => (
                <TableRow key={dispute.id}>
                  <TableCell className="font-medium">{dispute.id}</TableCell>
                  <TableCell>{dispute.type}</TableCell>
                  <TableCell>${Number(dispute.amount).toFixed(2)}</TableCell>
                  <TableCell>{dispute.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        dispute.status === "resolved"
                          ? "default"
                          : "destructive"
                      }
                      className="flex items-center gap-1 w-fit"
                    >
                      {dispute.status === "resolved" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {dispute.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dispute.resolution}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
