import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Send,
  User,
  Briefcase,
  DollarSign,
  Eye,
  Shield,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import type { ConnectorCandidate } from "./ConnectorCandidateCard";
import { formatMoneyWithCommas } from "@/lib/formatted-decimal";

interface SendCandidateConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: ConnectorCandidate | null;
  onSent: () => void;
}

export function SendCandidateConsentDialog({
  open,
  onOpenChange,
  candidate,
  onSent,
}: SendCandidateConsentDialogProps) {
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");
  const [subject, setSubject] = useState(
    `Exciting opportunity at ${candidate?.jobCompany || "[Company]"} - Your consent needed`
  );
  const [message, setMessage] = useState(
    `Hi ${candidate?.candidateName.split(" ")[0] || "[Name]"},

I hope this message finds you well! I came across an exciting opportunity that I think would be a perfect match for your skills and experience.

**Role:** ${candidate?.jobTitle || "[Job Title]"}
**Company:** ${candidate?.jobCompany || "[Company]"}
**Salary Range:** $${candidate?.expectedSalary ? (candidate.expectedSalary * 0.9).toLocaleString() : "XXX"} - $${candidate?.expectedSalary?.toLocaleString() || "XXX"}

Based on your background in ${candidate?.currentTitle || "[Current Title]"} at ${candidate?.currentCompany || "[Company]"}, I believe you'd be an excellent fit for this role.

Before I can share your profile with the hiring team, I need your consent. This is to ensure your privacy is protected throughout the process.

**What happens next:**
1. Click the link below to review the opportunity
2. If interested, confirm your consent
3. I'll introduce you to the recruiter
4. You'll receive a link to schedule an interview

Please let me know if you have any questions!

Best regards`
  );

  if (!candidate) return null;

  const handleSend = () => {
    onSent();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-teal-600" />
            Send Consent Request
          </DialogTitle>
          <DialogDescription>
            Ask {candidate.candidateName} for permission to share their profile
            with {candidate.jobCompany}
          </DialogDescription>
        </DialogHeader>

        {/* Candidate & Job Summary */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <Card className="border-teal-200 bg-teal-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-teal-600" />
                <span className="font-medium text-sm">Candidate</span>
              </div>
              <p className="font-semibold">{candidate.candidateName}</p>
              <p className="text-sm text-slate-600">{candidate.currentTitle}</p>
              <p className="text-xs text-slate-500">
                {candidate.currentCompany}
              </p>
              <Badge className="mt-2 bg-teal-100 text-teal-700">
                {candidate.matchScore}% Match
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Job Opportunity</span>
              </div>
              <p className="font-semibold">{candidate.jobTitle}</p>
              <p className="text-sm text-slate-600">{candidate.jobCompany}</p>
              <div className="flex items-center gap-1 mt-2">
                <DollarSign className="h-3 w-3 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600">
                  ${formatMoneyWithCommas(candidate.bountyAmount)} potential
                  bounty
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Email Composition */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose" className="gap-2">
              <Mail className="h-4 w-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                value={candidate.candidateEmail}
                disabled
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Message</Label>
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Assist
                </Button>
              </div>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            {/* Mandatory Footer Notice */}
            <div className="p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-slate-500 mt-0.5" />
                <div className="text-xs text-slate-600">
                  <p className="font-medium mb-1">
                    The following will be automatically added:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-500">
                    <li>Consent acceptance/decline buttons</li>
                    <li>Link to view job details</li>
                    <li>Privacy notice and Prospectly branding</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <Card className="border-slate-200">
              <CardContent className="p-6">
                {/* Email Header */}
                <div className="border-b pb-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <span className="font-medium">To:</span>
                    <span>{candidate.candidateEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <span className="font-medium">Subject:</span>
                    <span>{subject}</span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm">{message}</div>
                </div>

                {/* Auto-added Footer */}
                <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
                  <div className="text-center mb-4">
                    <p className="text-sm text-slate-600 mb-3">
                      Would you like to be considered for this opportunity?
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Button className="bg-teal-600 hover:bg-teal-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Yes, I'm Interested
                      </Button>
                      <Button variant="outline">No Thanks</Button>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="text-center text-xs text-slate-500">
                    <p>
                      Sent via{" "}
                      <span className="font-semibold text-teal-600">
                        Prospectly
                      </span>
                    </p>
                    <p className="mt-1">
                      Your information is protected and will only be shared with
                      your consent.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Consent Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendCandidateConsentDialog;
