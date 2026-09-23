import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { Loader2, XCircle } from "lucide-react";
import { AnyType } from "@/types/common";

const DECLINE_REASONS = [
  { value: "not_interested", label: "Not interested in this opportunity" },
  { value: "bad_timing", label: "Bad timing right now" },
  { value: "not_right_fit", label: "Not the right fit" },
  { value: "already_working", label: "Already working with similar company" },
  { value: "other", label: "Other (please specify below)" },
];

export default function DeclineIntroductionPublic() {
  const { requestId, bookingToken } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestData, setRequestData] = useState<AnyType>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchRequestData();
  }, [requestId, bookingToken]);

  const fetchRequestData = async () => {
    try {
      setLoading(true);
      setError("");

      // Verify the booking token and get request details via NestJS API
      const response = await fetch(
        `/api/introductions/${requestId}/public?token=${bookingToken}`
      );

      if (!response.ok) {
        throw new Error("Invalid or expired decline link");
      }

      const request = await response.json();

      // Check if already declined
      if (request.status === "declined") {
        throw new Error("This introduction has already been declined");
      }

      setRequestData(request);
    } catch (err: AnyType) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason) {
      toast({
        title: "Missing Information",
        description: "Please select a reason for declining",
        variant: "destructive",
      });
      return;
    }

    if (declineReason === "other" && !additionalNotes.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide additional details",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`/api/introductions/${requestId}/decline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingToken,
          declineReason,
          additionalNotes: additionalNotes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to decline introduction");
      }

      setSuccess(true);
      toast({
        title: "Introduction Declined",
        description: "The requester has been notified of your decision.",
      });
    } catch (err: AnyType) {
      toast({
        title: "Decline Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-secondary/5">
        <Loader message="Loading introduction details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-secondary/5 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Link</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please contact the person who sent you this introduction for
              assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-secondary/5 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Introduction Declined
            </CardTitle>
            <CardDescription>
              Your response has been recorded and all parties have been
              notified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Thank you for your prompt response. The requester and connector
                have been notified of your decision.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                (window.location.href = "https://prospectly.officebeacon.net")
              }
            >
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/5 to-secondary/5 p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <XCircle className="h-8 w-8 text-destructive" />
            Decline Introduction
          </h1>
          <p className="text-muted-foreground">
            Let us know why you're declining the meeting with{" "}
            {requestData?.profiles?.full_name}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Meeting Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div>
                <p className="text-sm font-medium">Requester</p>
                <p className="text-sm text-muted-foreground">
                  {requestData?.profiles?.full_name}
                  {requestData?.profiles?.company &&
                    ` from ${requestData.profiles.company}`}
                </p>
              </div>
              {requestData?.bounty_amount > 0 && (
                <div>
                  <p className="text-sm font-medium">Payout</p>
                  <p className="text-sm text-muted-foreground">
                    ${requestData.bounty_amount}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Reason for Declining *</Label>
                <Select value={declineReason} onValueChange={setDeclineReason}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {DECLINE_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">
                  Additional Details {declineReason === "other" && "*"}
                </Label>
                <Textarea
                  id="notes"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Please provide AnyType additional context (optional)"
                  rows={4}
                />
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <strong>Note:</strong> By declining this introduction, the
                requester and the person who facilitated this introduction will
                be notified. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.history.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDecline}
                disabled={submitting || !declineReason}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Declining...
                  </>
                ) : (
                  "Confirm Decline"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
