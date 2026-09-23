import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  ArrowRight,
  Shield,
  CheckCircle,
  Eye,
  UserCheck,
  Send,
  DollarSign,
  ArrowLeft,
  Play,
} from "lucide-react";

interface ContactUploadEducationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function ContactUploadEducationOverlay({
  isOpen,
  onClose,
  onComplete,
}: ContactUploadEducationOverlayProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [hasWatchedVideo, setHasWatchedVideo] = useState(false);

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
    // Mark as seen in localStorage
    localStorage.setItem("prospectly_education_overlay_seen", "true");
  };

  const handleSkip = () => {
    onClose();
    localStorage.setItem("prospectly_education_overlay_seen", "true");
  };

  // Reset to step 1 when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">
                How Contact Matching Works
              </h2>
              <p className="text-muted-foreground text-lg">
                Turn your network into meaningful introduction opportunities
              </p>
            </div>

            {/* Visual Flow Diagram */}
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-6 rounded-xl">
              <div className="flex items-center justify-between text-center">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium">Your Contacts</p>
                  <p className="text-xs text-muted-foreground">
                    Private & Secure
                  </p>
                </div>

                <ArrowRight className="w-6 h-6 text-muted-foreground mx-4" />

                <div className="flex-1">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium">Smart Matching</p>
                  <p className="text-xs text-muted-foreground">
                    Find Opportunities
                  </p>
                </div>

                <ArrowRight className="w-6 h-6 text-muted-foreground mx-4" />

                <div className="flex-1">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium">Warm Intros</p>
                  <p className="text-xs text-muted-foreground">You Control</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Example:</strong> Your contact John works at TechCorp.
                Another user needs an intro to someone at TechCorp. You get
                notified and can choose to make the introduction - earning
                credits and helping both parties!
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-3">
                Privacy & Security Guarantees
              </h2>
              <p className="text-muted-foreground text-lg">
                Your contacts' privacy is our top priority
              </p>
            </div>

            <div className="grid gap-4">
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                        Zero Direct Contact
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        We NEVER email, call, or contact your people directly.
                        Ever.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Eye className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                        Private Matching Only
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Your contacts are only used to privately identify
                        potential matches with others' prospect lists.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <UserCheck className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-1">
                        Encrypted & Secure
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        All contact data is encrypted with bank-level security.
                        Only you can access your contacts.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Your Promise:</strong> No spam, no unwanted emails, no
                sharing with third parties. Your network remains private and
                protected.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold mb-3">
                You Control Every Introduction
              </h2>
              <p className="text-muted-foreground text-lg">
                Complete approval process - nothing happens without your
                permission
              </p>
            </div>

            {/* Introduction Approval Flow */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Match Notification</h3>
                  <p className="text-sm text-muted-foreground">
                    You receive a notification when someone wants an intro to
                    one of your contacts
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-secondary/5 rounded-lg">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Review & Decide</h3>
                  <p className="text-sm text-muted-foreground">
                    See who's asking, why they want the intro, and their
                    background before deciding
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-500/5 rounded-lg">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    You Send the Introduction
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    If you approve, YOU send the introduction email through our
                    platform with your personal touch
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800 dark:text-green-200">
                  100% Your Choice
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                You can decline any introduction request. No explanations
                needed, no penalties.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-10 h-10 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold mb-3">
                Earn Credits & Build Relationships
              </h2>
              <p className="text-muted-foreground text-lg">
                Get rewarded for helping others make valuable connections
              </p>
            </div>

            <div className="grid gap-4">
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">
                        Earn Introduction Credits
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Each successful introduction earns you credits to
                        request your own introductions
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800 hover:bg-yellow-800 hover:text-yellow-100"
                    >
                      +5 Credits
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">
                        Build Your Reputation
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Quality introductions increase your trust rating and
                        unlock premium features
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800 hover:bg-blue-800 hover:text-blue-100"
                    >
                      Trust +1
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">
                        Expand Your Network
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Connect with other professionals and grow your valuable
                        relationships
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-purple-100 text-purple-800 hover:bg-purple-800 hover:text-purple-100"
                    >
                      Network+
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                <strong>Remember:</strong> Quality over quantity. Thoughtful
                introductions benefit everyone and build long-term professional
                relationships.
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Ready to Get Started?</h2>
              <p className="text-muted-foreground text-lg">
                Upload your contacts and start building valuable connections
              </p>
            </div>

            <div className="space-y-4">
              <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-3">
                    Quick Start Checklist:
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Upload your business contacts
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Connect your email accounts
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Review and approve introduction requests
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Start earning credits and building relationships
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Play className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                      Want to see it in action?
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Watch our 2-minute demo video to see exactly how the
                      process works.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHasWatchedVideo(true)}
                      className="text-blue-700 hover:bg-blue-700 hover:text-blue-100 border-blue-300 hover:bg-blue-100"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Watch Demo Video
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              By continuing, you agree that your contacts will only be used for
              private matching and that you maintain full control over all
              introductions.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-xl">Contact Upload Guide</DialogTitle>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Step {currentStep} of {totalSteps}
              </span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="py-6">{renderStep()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Tutorial
            </Button>
          </div>

          <Button onClick={handleNext} className="min-w-[120px]">
            {currentStep === totalSteps ? "Get Started" : "Next"}
            {currentStep < totalSteps && (
              <ArrowRight className="h-4 w-4 ml-1" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
