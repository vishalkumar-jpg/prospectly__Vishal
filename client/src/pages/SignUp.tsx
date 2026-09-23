import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import TrustedLogos from "@/components/TrustedLogos";
import SocialProof from "@/components/SocialProof";
import CommunityPledge from "@/components/CommunityPledge";
import WebsiteFooter from "@/components/WebsiteFooter";
import BottomCTASection from "@/components/signup/BottomCTASection";
import { Loader } from "@/components/ui/loader";
import FeaturesSection from "@/components/signup/FeaturesSection";
import HeroSection from "@/components/signup/HeroSection";
import PricingSection from "@/components/signup/PricingSection";

const SignUp = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isGoogleSigningUp, setIsGoogleSigningUp] = useState(false);
  const [isMicrosoftSigningUp, setIsMicrosoftSigningUp] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleGoogleSignUp = () => {
    setIsGoogleSigningUp(true);
    const baseUrl = import.meta.env.VITE_API_URL || "/api";
    const url = baseUrl.endsWith("/auth/google")
      ? baseUrl
      : `${baseUrl.replace(/\/$/, "")}/auth/google`;
    window.location.href = url;
  };

  const handleMicrosoftSignUp = () => {
    setIsMicrosoftSigningUp(true);
    const baseUrl = import.meta.env.VITE_API_URL || "/api";
    const url = baseUrl.endsWith("/auth/microsoft")
      ? baseUrl
      : `${baseUrl.replace(/\/$/, "")}/auth/microsoft`;
    window.location.href = url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/30">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sign Up - Prospectly™ | Join the Connector Economy™"
        description="Join thousands of professionals earning through warm introductions. Free to join, no credit card required."
        canonical="/signup"
      />
      <Navigation marketingSurface={false} />

      {/* Hero Section */}
      <HeroSection
        onGoogleSignUp={handleGoogleSignUp}
        onMicrosoftSignUp={handleMicrosoftSignUp}
        isSigningUpGoogle={isGoogleSigningUp}
        isSigningUpMicrosoft={isMicrosoftSigningUp}
      />

      {/* Trust Indicators */}
      <TrustedLogos />

      {/* Features Grid */}
      <FeaturesSection />

      {/* Social Proof */}
      <SocialProof />

      {/* Free to Join Badge */}
      <PricingSection />

      {/* Community Pledge */}
      <CommunityPledge />

      {/* Bottom CTA */}
      <BottomCTASection
        onSignUp={handleGoogleSignUp}
        onMicrosoftSignUp={handleMicrosoftSignUp}
        isSigningUpGoogle={isGoogleSigningUp}
        isSigningUpMicrosoft={isMicrosoftSigningUp}
      />

      <WebsiteFooter />
    </div>
  );
};

export default SignUp;
