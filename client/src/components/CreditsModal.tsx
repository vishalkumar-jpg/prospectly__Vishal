import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Gift, Mail, User, Sparkles, CheckCircle } from "lucide-react";

interface CreditsModalProps {
  children: React.ReactNode;
}

const CreditsModal = ({ children }: CreditsModalProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to claim your credits.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast({
      title: "Success! 🎉",
      description:
        "Your free credits have been added to your account. Check your email for details.",
    });

    setIsSubmitting(false);
    setIsOpen(false);
    setEmail("");
    setName("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="h-6 w-6 text-primary" />
            Claim Your Free Credits
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Credits Offer */}
          <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-center mb-3">
              <Sparkles className="h-8 w-8 text-primary mr-2" />
              <span className="text-3xl font-bold text-primary">100</span>
              <span className="text-lg text-muted-foreground ml-1">
                free credits
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Perfect for exploring Prospectly's lead generation capabilities
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-foreground">
              What you get:
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">100 lead searches & exports</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">Access to all data sources</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">Email verification included</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">No credit card required</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full hero-gradient text-white border-0 shadow-hero hover:shadow-glow transition-smooth"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Claiming Credits...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Claim Free Credits
                </>
              )}
            </Button>
          </form>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t">
            <Badge variant="secondary" className="text-xs">
              No spam, ever
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Instant access
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditsModal;
