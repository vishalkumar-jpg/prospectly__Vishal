import { Shield, Lock, Eye, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PrivacyAssuranceProps {
  variant?: "prominent" | "inline" | "minimal";
  className?: string;
}

export function PrivacyAssurance({
  variant = "prominent",
  className = "",
}: PrivacyAssuranceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (variant === "minimal") {
    return (
      <div
        className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}
      >
        <Shield className="h-4 w-4 text-green-600" />
        <span>
          We will never email or spam your contacts. They're only used to find
          matches for warm introductions.
        </span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={`bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
              Your Contacts Stay Private
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              We will never email or spam your contacts. They're only used to
              find matches for warm introductions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={`border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50 ${className}`}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Main Promise */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-green-100 dark:bg-green-900 rounded-full">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200 text-lg mb-2">
                Your Contacts Stay Private & Protected
              </h3>
              <p className="text-green-700 dark:text-green-300 text-base leading-relaxed">
                We will never email or spam your contacts. They're only used to
                find matches for warm introductions.
              </p>
            </div>
          </div>

          {/* Expandable Details */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
              >
                <Eye className="h-4 w-4 mr-1" />
                How We Protect Your Data
                <span className="ml-1">{isExpanded ? "−" : "+"}</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="grid gap-3">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <strong className="text-green-800 dark:text-green-200">
                      Encrypted Storage:
                    </strong>
                    <span className="text-green-700 dark:text-green-300 ml-1">
                      All contact data is encrypted with 256-bit AES encryption
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <strong className="text-green-800 dark:text-green-200">
                      Limited Access:
                    </strong>
                    <span className="text-green-700 dark:text-green-300 ml-1">
                      Only you can see your contacts - no sharing with third
                      parties
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <strong className="text-green-800 dark:text-green-200">
                      Zero Communication:
                    </strong>
                    <span className="text-green-700 dark:text-green-300 ml-1">
                      We never send emails, calls, or messages to your contacts
                    </span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}
