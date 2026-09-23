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
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowLeft,
  User,
  Briefcase,
  Award,
  Shield,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";

export default function GettingStartedStep3() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    linkedin: "",
    company: "",
    title: "",
    bio: "",
    expertise: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    toast({
      title: "Profile Verified! ✅",
      description:
        "Your profile has been verified. You now have access to premium features and higher success rates.",
    });
    navigate("/getting-started/step-4");
  };

  const isFormComplete =
    formData.linkedin && formData.company && formData.title && formData.bio;

  return (
    <>
      <SEO
        title="Step 3: Complete Profile Verification | Prospectly"
        description="Build trust for higher success rates with profile verification."
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
              3
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                Complete Profile Verification
              </h1>
              <p className="text-muted-foreground">
                Build trust for higher success rates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>3 minutes</span>
            </div>
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <TrendingUp className="h-4 w-4" />
              <span>89% vs 31% success rate</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 mb-8">
          {/* Trust badges */}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-800">
                    Why Verification Matters
                  </h3>
                  <p className="text-sm text-green-700">
                    Verified profiles get 89% success rates vs 31% for
                    unverified
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Higher trust scores</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Premium features</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Priority matching</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Professional Profile
              </CardTitle>
              <CardDescription>
                Complete your professional profile to build trust with other
                members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn Profile URL *</Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/yourname"
                  value={formData.linkedin}
                  onChange={(e) =>
                    handleInputChange("linkedin", e.target.value)
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Current Company *</Label>
                  <Input
                    id="company"
                    placeholder="Company Name"
                    value={formData.company}
                    onChange={(e) =>
                      handleInputChange("company", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    placeholder="Your Job Title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio *</Label>
                <Textarea
                  id="bio"
                  placeholder="Brief description of your professional background and expertise..."
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expertise">Areas of Expertise (Optional)</Label>
                <Input
                  id="expertise"
                  placeholder="e.g., SaaS, FinTech, Healthcare, Marketing"
                  value={formData.expertise}
                  onChange={(e) =>
                    handleInputChange("expertise", e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Verification benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Verification Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Trust Badge</div>
                      <div className="text-muted-foreground">
                        Verified badge on your profile
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Higher Success Rates</div>
                      <div className="text-muted-foreground">
                        89% vs 31% introduction success
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Premium Features</div>
                      <div className="text-muted-foreground">
                        Access to advanced matching
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Priority Support</div>
                      <div className="text-muted-foreground">
                        Dedicated customer success
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between">
          <Link to="/getting-started/step-2">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous Step
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={!isFormComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Verify Profile
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
