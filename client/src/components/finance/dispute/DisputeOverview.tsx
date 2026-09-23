import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

interface DisputeOverviewProps {
  onFileDisputeClick: () => void;
}

export function DisputeOverview({ onFileDisputeClick }: DisputeOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-red-600 via-rose-600 to-pink-700 rounded-2xl shadow-2xl border border-white/20">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-transparent to-pink-600/20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-rose-400/20 rounded-full blur-2xl"></div>

        <div className="relative z-10 p-4 md:p-8">
          <div className="flex flex-col space-y-2">
            <h2 className="text-4xl font-bold text-white flex items-center gap-3">
              <AlertCircle className="h-10 w-10 text-white/90" />
              Dispute Overview
            </h2>
            <p className="text-white/90 text-lg">
              Manage and track your transaction disputes
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Disputes
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Currently open</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Not approved</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File a New Dispute</CardTitle>
          <CardDescription>
            If you have an issue with a transaction or introduction, you can
            file a dispute
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onFileDisputeClick}>
            <AlertCircle className="mr-2 h-4 w-4" />
            File New Dispute
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispute Process</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Submit a dispute with detailed information and evidence</p>
          <p>• Our team reviews the dispute within 2-3 business days</p>
          <p>• Both parties may be contacted for additional information</p>
          <p>• A decision is made and communicated to all parties</p>
          <p>
            • If approved, appropriate action is taken (refund, credit, etc.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
