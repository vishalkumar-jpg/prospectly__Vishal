import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockDisputes = [
  {
    id: "DISP-001",
    type: "Payment Issue",
    description: "Incorrect charge for introduction",
    amount: 50.0,
    status: "under_review",
    priority: "high",
    date: "2024-01-15",
    relatedTransaction: "TXN-12345",
  },
  {
    id: "DISP-002",
    type: "Service Quality",
    description: "Introduction did not meet expectations",
    amount: 100.0,
    status: "open",
    priority: "medium",
    date: "2024-01-14",
    relatedTransaction: "TXN-12344",
  },
  {
    id: "DISP-003",
    type: "Duplicate Charge",
    description: "Charged twice for same service",
    amount: 75.0,
    status: "escalated",
    priority: "high",
    date: "2024-01-13",
    relatedTransaction: "TXN-12343",
  },
];

const getStatusColor = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "open":
      return "default";
    case "under_review":
      return "secondary";
    case "escalated":
      return "destructive";
    case "resolved":
      return "outline";
    default:
      return "outline";
  }
};

const getPriorityColor = (
  priority: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (priority) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "outline";
  }
};

export function ActiveDisputes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-accent to-destructive rounded-md shadow-2xl border border-border">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-accent/20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-card/10 rounded-md blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-destructive/20 rounded-md blur-2xl"></div>

        <div className="relative z-10 p-4 md:p-8">
          <div className="flex flex-col space-y-2">
            <h2 className="text-4xl font-bold text-white flex items-center gap-3">
              <AlertCircle className="h-10 w-10 text-white/90" />
              Active Disputes
            </h2>
            <p className="text-white/90 text-lg">
              Track and manage your open disputes
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search disputes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {mockDisputes.map((dispute) => (
          <Card key={dispute.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-lg">{dispute.id}</CardTitle>
                    <Badge variant={getPriorityColor(dispute.priority)}>
                      {dispute.priority} priority
                    </Badge>
                  </div>
                  <CardDescription>
                    {dispute.type} • Filed on {dispute.date}
                  </CardDescription>
                </div>
                <Badge variant={getStatusColor(dispute.status)}>
                  {dispute.status.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm">{dispute.description}</p>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Disputed Amount
                    </p>
                    <p className="text-lg font-semibold">
                      ${Number(dispute.amount).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Related Transaction
                    </p>
                    <p className="text-sm font-medium">
                      {dispute.relatedTransaction}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
