import { useState } from "react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  ArrowRight,
  Clock,
  TrendingUp,
  ArrowLeft,
  Users,
  MessageSquare,
  Star,
  Gift,
  CheckCircle,
  DollarSign,
  Shield,
  Award,
  Verified,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";

// Mock data for potential bounties based on introduction value
const potentialBounties = [
  {
    type: "Partnership Introduction",
    baseAmount: 500,
    multiplier: 1.5,
    description: "Strategic business partnerships",
    icon: "🤝",
  },
  {
    type: "Sales Introduction",
    baseAmount: 750,
    multiplier: 2.0,
    description: "Direct sales opportunities",
    icon: "💰",
  },
  {
    type: "Investment Introduction",
    baseAmount: 1000,
    multiplier: 3.0,
    description: "Funding and investment connections",
    icon: "📈",
  },
  {
    type: "Technical Collaboration",
    baseAmount: 400,
    multiplier: 1.2,
    description: "Technical partnerships and integrations",
    icon: "⚡",
  },
];

// Mock trust score data
const trustScoreData = {
  currentScore: 72,
  maxScore: 100,
  badges: ["verified-email", "verified-phone", "positive-reviews-5"],
  memberSince: "2024",
  reviewCount: 8,
  avgRating: 4.6,
  completedIntroductions: 12,
  successRate: 85,
};

export default function GettingStartedStep4() {
  const navigate = useNavigate();
  const [introData, setIntroData] = useState({
    contactName: "",
    contactCompany: "",
    contactRole: "",
    recipientName: "",
    recipientCompany: "",
    why: "",
    value: "",
    introType: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setIntroData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    toast({
      title: "First Introduction Given! 🎉",
      description:
        "Congratulations! You've made your first warm introduction. You're now ready to start receiving introductions from the community.",
    });
    navigate("/dashboard");
  };

  const isFormComplete =
    introData.contactName &&
    introData.recipientName &&
    introData.why &&
    introData.value &&
    introData.introType;

  // Calculate potential bounty based on introduction type
  const getEstimatedBounty = () => {
    const selectedType = potentialBounties.find(
      (bounty) => bounty.type === introData.introType
    );
    if (!selectedType) return 0;
    return Math.round(selectedType.baseAmount * selectedType.multiplier);
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <>
      <SEO
        title="Step 4: Give Your First Warm Introduction | Prospectly"
        description="Give to get - make your first warm introduction to unlock the full power of our network."
      />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link
            to="/getting-started"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Getting Started
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              4
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                Give Your First Warm Introduction
              </h1>
              <p className="text-muted-foreground">
                Every member must first give to get warm introductions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>5 minutes</span>
            </div>
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <TrendingUp className="h-4 w-4" />
              <span>Unlock full network access</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 mb-8">
          {/* Trust Score & Bounty Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trust Score Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  Your Trust Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                      {trustScoreData.currentScore}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-2xl font-bold ${getTrustScoreColor(trustScoreData.currentScore)}`}
                      >
                        {trustScoreData.currentScore}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / 100
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {trustScoreData.successRate}% Success Rate
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-smooth"
                        style={{ width: `${trustScoreData.currentScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>
                      {trustScoreData.avgRating}/5 ({trustScoreData.reviewCount}{" "}
                      reviews)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>
                      {trustScoreData.completedIntroductions} introductions
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {trustScoreData.badges.map((badge, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Verified className="h-3 w-3 mr-1" />
                      {badge.replace("-", " ")}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bounty Potential Card */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Referral Payout Potential
                </CardTitle>
                <CardDescription>
                  Earn rewards for successful introductions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {introData.introType && (
                  <div className="p-4 bg-white rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Estimated Referral Payout</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${getEstimatedBounty().toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Based on {introData.introType} introduction type
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {potentialBounties.map((bounty, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{bounty.icon}</span>
                        <div>
                          <div className="font-medium text-sm">
                            {bounty.type}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {bounty.description}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-green-600">
                        ${Math.round(bounty.baseAmount * bounty.multiplier)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Give to Get philosophy */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Heart className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-medium text-primary">
                    Give to Get Philosophy
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Our community thrives on reciprocity. By giving first, you
                    demonstrate your commitment to helping others succeed.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <span>Give value first</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Build trust & reputation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span>Unlock premium access</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Introduction form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Make Your First Introduction
              </CardTitle>
              <CardDescription>
                Connect two people from your network who could benefit from
                knowing each other
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Introduction Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="introType">Introduction Type *</Label>
                <Select
                  value={introData.introType}
                  onValueChange={(value) =>
                    handleInputChange("introType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of introduction" />
                  </SelectTrigger>
                  <SelectContent>
                    {potentialBounties.map((bounty, index) => (
                      <SelectItem key={index} value={bounty.type}>
                        <div className="flex items-center gap-2">
                          <span>{bounty.icon}</span>
                          <div>
                            <div className="font-medium">{bounty.type}</div>
                            <div className="text-xs text-muted-foreground">
                              Est. $
                              {Math.round(
                                bounty.baseAmount * bounty.multiplier
                              )}{" "}
                              referral payout
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact 1 - Who you're introducing */}
              <div className="space-y-4">
                <h4 className="font-medium">Person 1 (From your network)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Full Name *</Label>
                    <Input
                      id="contactName"
                      placeholder="John Smith"
                      value={introData.contactName}
                      onChange={(e) =>
                        handleInputChange("contactName", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactCompany">Company</Label>
                    <Input
                      id="contactCompany"
                      placeholder="Company Name"
                      value={introData.contactCompany}
                      onChange={(e) =>
                        handleInputChange("contactCompany", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactRole">Role/Title</Label>
                    <Input
                      id="contactRole"
                      placeholder="VP of Sales"
                      value={introData.contactRole}
                      onChange={(e) =>
                        handleInputChange("contactRole", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Contact 2 - Who they want to meet */}
              <div className="space-y-4">
                <h4 className="font-medium">
                  Person 2 (Who they want to meet)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Full Name *</Label>
                    <Input
                      id="recipientName"
                      placeholder="Jane Doe"
                      value={introData.recipientName}
                      onChange={(e) =>
                        handleInputChange("recipientName", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientCompany">Company</Label>
                    <Input
                      id="recipientCompany"
                      placeholder="Target Company"
                      value={introData.recipientCompany}
                      onChange={(e) =>
                        handleInputChange("recipientCompany", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Why this introduction makes sense */}
              <div className="space-y-2">
                <Label htmlFor="why">Why should they connect? *</Label>
                <Textarea
                  id="why"
                  placeholder="Explain why these two people should know each other. What do they have in common? How could they help each other?"
                  value={introData.why}
                  onChange={(e) => handleInputChange("why", e.target.value)}
                  rows={3}
                />
              </div>

              {/* Value proposition */}
              <div className="space-y-2">
                <Label htmlFor="value">What value could this create? *</Label>
                <Textarea
                  id="value"
                  placeholder="Describe the potential business value, partnership opportunity, or mutual benefit this introduction could create..."
                  value={introData.value}
                  onChange={(e) => handleInputChange("value", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* What happens next */}
          <Card>
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="font-medium">Introduction Review</div>
                    <div className="text-muted-foreground">
                      We'll review your introduction for quality and relevance
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="font-medium">Approval & Credits</div>
                    <div className="text-muted-foreground">
                      Once approved, you'll earn introduction credits and unlock
                      full access
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="font-medium">Start Receiving</div>
                    <div className="text-muted-foreground">
                      You can now request introductions from our community
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between">
          <Link to="/getting-started/step-3">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous Step
            </Button>
          </Link>
          <Button onClick={handleSubmit} disabled={!isFormComplete}>
            <Heart className="h-4 w-4 mr-2" />
            Submit Introduction
            {introData.introType && (
              <Badge variant="secondary" className="ml-2">
                ${getEstimatedBounty()} potential
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
