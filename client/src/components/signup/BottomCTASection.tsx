import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface BottomCTASectionProps {
  onSignUp: () => void;
  onMicrosoftSignUp: () => void;
  isSigningUpGoogle: boolean;
  isSigningUpMicrosoft: boolean;
}

export default function BottomCTASection({
  onSignUp,
  onMicrosoftSignUp,
  isSigningUpGoogle,
  isSigningUpMicrosoft,
}: BottomCTASectionProps) {
  return (
    <section className="py-16 md:py-28 bg-gradient-to-br from-primary via-purple-600 to-primary/90 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full mix-blend-screen filter blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-white rounded-full mix-blend-screen filter blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Heading */}
          <div className="space-y-3">
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              Ready to Start Earning?
            </h2>
            <p className="text-lg text-white/80">
              Join thousands of connectors making meaningful introductions and
              building income.
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="space-y-3 flex flex-col items-center">
            <div className="flex items-center gap-3 text-white/90 text-sm">
              <span>✓</span>
              <span>Free to join • No credit card</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 text-sm">
              <span>✓</span>
              <span>Earn immediately after your first introduction</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 text-sm">
              <span>✓</span>
              <span>10,000+ professionals already earning</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="pt-6">
            <div className="flex flex-col gap-4 items-center">
              <Button
                type="button"
                onClick={onSignUp}
                disabled={isSigningUpGoogle || isSigningUpMicrosoft}
                className="w-full sm:w-[320px] h-12 bg-white text-primary shadow-md hover:bg-white hover:text-primary hover:shadow-lg transition-all duration-300 hover:scale-[1.01] font-normal text-base border-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
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
                className="w-full sm:w-[320px] h-12 bg-white text-primary hover:bg-white hover:text-primary transition-all duration-300 hover:scale-[1.01] font-normal text-base border-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                size="lg"
              >
                {isSigningUpMicrosoft ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <div className="flex items-center pl-[10px]">
                    <svg
                      className="w-5 h-5 mr-3"
                      viewBox="0 0 23 23"
                      fill="currentColor"
                    >
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

          {/* Legal note */}
          <p className="text-xs text-white/70 pt-4">
            By signing up, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-white">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline hover:text-white">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
