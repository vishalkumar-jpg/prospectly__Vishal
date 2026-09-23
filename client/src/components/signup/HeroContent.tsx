import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check } from "lucide-react";

interface HeroContentProps {
  onGoogleSignUp: () => void;
  onMicrosoftSignUp: () => void;
  isSigningUpGoogle: boolean;
  isSigningUpMicrosoft: boolean;
}

export const HeroContent = ({
  onGoogleSignUp,
  onMicrosoftSignUp,
  isSigningUpGoogle,
  isSigningUpMicrosoft,
}: HeroContentProps) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700 flex flex-col items-center text-center md:items-start md:text-left">
      {/* Badge */}
      <Badge
        variant="secondary"
        className="w-fit feature-gradient border border-primary/20 px-3 py-1"
      >
        ✨ Join the Connector Economy™
      </Badge>

      {/* Headline */}
      <div className="space-y-4 w-full">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-foreground">
          Turn Your Network <br className="hidden md:block" />
          Into{" "}
          <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Income
          </span>
        </h1>
        <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed max-w-lg mx-auto md:ml-0">
          Get paid for warm introductions. No cold calling. No spam. Just real
          connections.
        </p>
      </div>

      {/* Trust Indicators */}
      <div className="space-y-4 pt-4 w-full flex flex-col items-center md:items-start">
        {[
          "5,000+ Successful Introductions",
          "98% Success Rate",
          "1.2 Days Avg. Introduction Time",
        ].map((text, i) => (
          <div key={i} className="flex items-center gap-3 text-sm font-medium">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
            <span className="text-muted-foreground">{text}</span>
          </div>
        ))}
      </div>

      {/* CTA Buttons */}
      <div className="pt-8 w-full flex justify-center md:justify-start">
        <div className="flex flex-col gap-4 w-full max-w-[320px]">
          <Button
            type="button"
            onClick={onGoogleSignUp}
            disabled={isSigningUpGoogle || isSigningUpMicrosoft}
            className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-normal text-base border-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            size="lg"
          >
            {isSigningUpGoogle ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Sign Up with Google</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={onMicrosoftSignUp}
            disabled={isSigningUpGoogle || isSigningUpMicrosoft}
            className="w-full h-12 bg-gradient-to-r from-primary/90 to-purple-600/90 hover:from-primary hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-normal text-base border-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            size="lg"
          >
            {isSigningUpMicrosoft ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <div className="flex items-center pl-[10px]">
                <svg className="w-5 h-5 mr-3" viewBox="0 0 23 23" fill="none">
                  <path d="M11 0H0V11H11V0Z" fill="#F25022" />
                  <path d="M23 0H12V11H23V0Z" fill="#7FBA00" />
                  <path d="M11 12H0V23H11V12Z" fill="#00A4EF" />
                  <path d="M23 12H12V23H23V12Z" fill="#FFB900" />
                </svg>
                <span>Sign Up with Microsoft</span>
              </div>
            )}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center md:text-left">
        No credit card required • Takes less than a minute
      </p>
    </div>
  );
};
