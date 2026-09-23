import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  TrendingUp,
  Users,
  MapPin,
  Shield,
  Activity,
  Crown,
} from "lucide-react";

// Mock data for matching factors with weights and scores
const matchingFactors = [
  {
    factor: "Industry Alignment",
    weight: 25,
    score: 92,
    description: "Technology sector match",
    details: [
      "B2B SaaS experience",
      "AI/ML industry involvement",
      "FinTech background alignment",
      "Startup ecosystem familiarity",
    ],
  },
  {
    factor: "Geographic Proximity",
    weight: 20,
    score: 88,
    description: "San Francisco Bay Area",
    details: [
      "Same metropolitan area",
      "Similar timezone for meetings",
      "Local market knowledge",
      "In-person networking opportunities",
    ],
  },
  {
    factor: "Trust Score Compatibility",
    weight: 30,
    score: 95,
    description: "Trust score: 4.2/5.0",
    details: [
      "Meets minimum threshold (4.0)",
      "Strong referral history",
      "Verified business credentials",
      "Positive feedback rating",
    ],
  },
  {
    factor: "Network Overlap",
    weight: 15,
    score: 76,
    description: "12 mutual connections",
    details: [
      "Shared professional contacts",
      "Similar company backgrounds",
      "Common educational institutions",
      "Industry event attendance",
    ],
  },
  {
    factor: "Activity Level",
    weight: 10,
    score: 84,
    description: "High engagement potential",
    details: [
      "Regular platform usage",
      "Active in group discussions",
      "Frequent introduction activity",
      "Quick response time",
    ],
  },
];

// Mock data for predicted outcomes
const predictedOutcomes = [
  {
    metric: "Connection Success Rate",
    prediction: "87%",
    confidence: "High",
    impact: "Direct networking opportunities",
    description: "Based on similar user profiles and trust scores",
  },
  {
    metric: "Network Growth",
    prediction: "+34 contacts",
    confidence: "Medium",
    impact: "Expanded professional network",
    description: "Estimated new connections within 90 days",
  },
  {
    metric: "Business Opportunities",
    prediction: "5-8 qualified leads",
    confidence: "Medium",
    impact: "Revenue generation potential",
    description: "Based on group member activity and industry alignment",
  },
  {
    metric: "Knowledge Exchange",
    prediction: "High value",
    confidence: "High",
    impact: "Industry insights and trends",
    description: "Access to cutting-edge industry discussions",
  },
];

const GroupMatchingAlgorithm = () => {
  // Calculate overall score based on weighted factors
  const overallScore = Math.round(
    matchingFactors.reduce(
      (total, factor) => total + (factor.score * factor.weight) / 100,
      0
    )
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "High":
        return "bg-green-100 text-green-800 hover:bg-green-800 hover:text-green-100";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-800 hover:text-yellow-100";
      case "Low":
        return "bg-red-100 text-red-800 hover:bg-red-800 hover:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-800 hover:text-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">AI Matching Algorithm</h2>
        <p className="text-muted-foreground">
          Understanding how we match you with the perfect groups
        </p>
      </div>

      {/* Overall Match Score */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <Crown className="h-6 w-6 text-primary" />
            <span>Overall Match Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <div
              className={`text-4xl font-bold ${getScoreColor(overallScore)}`}
            >
              {overallScore}%
            </div>
            <p className="text-muted-foreground">Excellent compatibility</p>
          </div>
          <Progress value={overallScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Matching Factors Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Matching Factors Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {matchingFactors.map((factor, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{factor.factor}</h4>
                    <Badge variant="outline">{factor.weight}% weight</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {factor.description}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className={`text-xl font-bold ${getScoreColor(factor.score)}`}
                  >
                    {factor.score}%
                  </div>
                </div>
              </div>

              <Progress value={factor.score} className="h-2" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {factor.details.map((detail, detailIndex) => (
                  <div
                    key={detailIndex}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-muted-foreground">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Predicted Outcomes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-primary" />
            Predicted Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictedOutcomes.map((outcome, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{outcome.metric}</h4>
                  <Badge className={getConfidenceColor(outcome.confidence)}>
                    {outcome.confidence} Confidence
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="text-2xl font-bold text-primary">
                    {outcome.prediction}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {outcome.impact}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {outcome.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Algorithm Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary" />
            Algorithm Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <h4 className="font-medium text-primary mb-2">
                Why This Group is Perfect for You
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>
                    Your technology background aligns perfectly with 89% of
                    group members
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>
                    Geographic proximity enables frequent in-person networking
                    opportunities
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>
                    Your trust score exceeds group requirements, ensuring smooth
                    integration
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>
                    Mutual connections provide warm introduction pathways
                  </span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-3 border rounded-lg">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-medium">847 Members</p>
                <p className="text-sm text-muted-foreground">
                  Active community
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Local Focus</p>
                <p className="text-sm text-muted-foreground">
                  Bay Area network
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-medium">High Growth</p>
                <p className="text-sm text-muted-foreground">
                  Expanding rapidly
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupMatchingAlgorithm;
