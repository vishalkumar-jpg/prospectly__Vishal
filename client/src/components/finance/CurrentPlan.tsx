import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";

interface CurrentPlanProps {
  onUpgradeClick: () => void;
  onManageSubscriptionClick: () => void;
}

export function CurrentPlan({
  onUpgradeClick,
  onManageSubscriptionClick,
}: CurrentPlanProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-orange-600 to-red-700 rounded-2xl shadow-2xl border border-white/20">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-transparent to-red-600/20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400/20 rounded-full blur-2xl"></div>

        <div className="relative z-10 p-4 md:p-8">
          <div className="flex flex-col space-y-2">
            <h2 className="text-4xl font-bold text-white flex items-center gap-3">
              <Zap className="h-10 w-10 text-white/90" />
              Current Plan
            </h2>
            <p className="text-white/90 text-lg">
              Manage your subscription and billing
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Basic features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              $0
              <span className="text-sm font-normal text-muted-foreground">
                /month
              </span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />5
                introductions/month
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Basic search
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Email support
              </li>
            </ul>
            <Badge variant="outline">Current Plan</Badge>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Professional
              <Badge variant="default">Popular</Badge>
            </CardTitle>
            <CardDescription>For growing networks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              $29
              <span className="text-sm font-normal text-muted-foreground">
                /month
              </span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Unlimited introductions
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Advanced search & filters
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                AI-powered matching
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Priority support
              </li>
            </ul>
            <Button onClick={onUpgradeClick} className="w-full">
              Upgrade to Professional
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Enterprise
            </CardTitle>
            <CardDescription>For large organizations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">Custom</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Everything in Professional
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Custom integrations
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Dedicated account manager
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                SLA guarantee
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>Update or cancel your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onManageSubscriptionClick} variant="outline">
            Manage Subscription
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
