import { HeroContent } from "./HeroContent";
import { AppPreview } from "./AppPreview";

interface HeroSectionProps {
  onGoogleSignUp: () => void;
  onMicrosoftSignUp: () => void;
  isSigningUpGoogle: boolean;
  isSigningUpMicrosoft: boolean;
}

export default function HeroSection({
  onGoogleSignUp,
  onMicrosoftSignUp,
  isSigningUpGoogle,
  isSigningUpMicrosoft,
}: HeroSectionProps) {
  return (
    <section className="min-h-screen pt-20 pb-12 md:pt-24 md:pb-16 bg-gradient-to-br from-background via-muted/20 to-muted/30 flex items-center justify-center overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center max-w-7xl mx-auto">
          <HeroContent
            onGoogleSignUp={onGoogleSignUp}
            onMicrosoftSignUp={onMicrosoftSignUp}
            isSigningUpGoogle={isSigningUpGoogle}
            isSigningUpMicrosoft={isSigningUpMicrosoft}
          />
          <AppPreview />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-10px) rotate(var(--tw-rotate)); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2000ms;
        }
      `}</style>
    </section>
  );
}
