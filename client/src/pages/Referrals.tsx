import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader } from "@/components/ui/loader";
import {
  Loader2,
  Send,
  Gift,
  Users,
  CheckCircle,
  Mail,
  TrendingUp,
} from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { toUTC } from "@/lib/dayjs";
import { AnyType } from "@/types/common";

const Referrals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState("");
  const [organisationId, setOrganisationId] = useState("");

  // Fetch referral progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["referrals", "progress"],
    queryFn: () => api.referrals.getProgress(),
  });

  // Fetch subscription plans
  const { data: plansData } = useQuery({
    queryKey: ["subscriptions", "plans"],
    queryFn: () => api.subscriptions.getPlans(),
  });

  // Fetch earned coupons
  const { data: earnedCoupons } = useQuery({
    queryKey: ["referrals", "earned-coupons"],
    queryFn: () => api.referrals.getEarnedCoupons(),
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: () =>
      api.referrals.sendInvite({
        email,
        planId,
        organisationId: organisationId || undefined,
      }),
    onSuccess: () => {
      toast({
        title: "Invite Sent",
        description: "Your referral invite has been sent successfully.",
      });
      setEmail("");
      setPlanId("");
      setOrganisationId("");
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
    },
    onError: (error: AnyType) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
        variant: "destructive",
      });
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !planId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    sendInviteMutation.mutate();
  };

  const totalInvites = progress?.totalInvitesSent || 0;
  const acceptedInvites = progress?.totalInvitesAccepted || 0;
  const acceptanceRate =
    totalInvites > 0 ? (acceptedInvites / totalInvites) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Referrals</h1>
        <p className="text-muted-foreground">
          Invite others and earn rewards when they join
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invites Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressLoading ? (
                <Loader size="sm" className="py-0 gap-0" />
              ) : (
                totalInvites
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total invitations sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Invites Accepted
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressLoading ? (
                <Loader size="sm" className="py-0 gap-0" />
              ) : (
                acceptedInvites
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {acceptanceRate.toFixed(1)}% acceptance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Earned Coupons
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {earnedCoupons ? earnedCoupons.length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Rewards unlocked</p>
          </CardContent>
        </Card>
      </div>

      {/* Send Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Referral Invite</CardTitle>
          <CardDescription>
            Invite someone to join Prospectly and earn rewards when they
            subscribe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Subscription Plan *</Label>
              <Select value={planId} onValueChange={setPlanId} required>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plansData?.plans
                    ?.filter((plan) => !plan.isDefault)
                    .map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} -{" "}
                        {plan.yearlyPrice
                          ? `$${Number(plan.yearlyPrice.price) / 100}/year`
                          : plan.monthlyPrice
                            ? `$${Number(plan.monthlyPrice.price) / 100}/month`
                            : "Free"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organisation">Organization ID (Optional)</Label>
              <Input
                id="organisation"
                type="text"
                placeholder="Leave empty if not applicable"
                value={organisationId}
                onChange={(e) => setOrganisationId(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={sendInviteMutation.isPending}
            >
              {sendInviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Earned Coupons */}
      {earnedCoupons && earnedCoupons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Earned Coupons
            </CardTitle>
            <CardDescription>
              Coupons you've earned through referrals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {earnedCoupons.map((coupon: AnyType, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {coupon.plan_name || "Premium Plan"}
                      </Badge>
                      {coupon.used_at ? (
                        <Badge variant="outline">Used</Badge>
                      ) : (
                        <Badge variant="default">Available</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Threshold: {coupon.threshold} verified contacts
                    </p>
                    {coupon.threshold_met_at && (
                      <p className="text-xs text-muted-foreground">
                        Earned on{" "}
                        {toUTC(coupon.threshold_met_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {coupon.used_at ? (
                    <span className="text-sm text-muted-foreground">
                      Used on {toUTC(coupon.used_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress by Plan */}
      {plansData?.plans
        ?.filter((plan) => !plan.isDefault)
        .map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {plan.name} Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReferralPlanProgress planId={plan.id} planName={plan.name} />
            </CardContent>
          </Card>
        ))}
    </div>
  );
};

// Component to show progress for a specific plan
const ReferralPlanProgress = ({
  planId,
  planName,
}: {
  planId: string;
  planName: string;
}) => {
  const { data: verifiedContacts } = useQuery({
    queryKey: ["referrals", "verified-contacts", planId],
    queryFn: () => api.referrals.getVerifiedContacts(planId),
  });

  // Default threshold (should come from backend config)
  const threshold = 10;
  const current = verifiedContacts?.count || 0;
  const progress = Math.min((current / threshold) * 100, 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Verified Contacts</span>
        <span className="font-medium">
          {current} / {threshold}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
      {current >= threshold ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Threshold met! You've earned a coupon for {planName}.
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-sm text-muted-foreground">
          {threshold - current} more verified contact
          {threshold - current !== 1 ? "s" : ""} needed to earn a coupon
        </p>
      )}
    </div>
  );
};

export default Referrals;
