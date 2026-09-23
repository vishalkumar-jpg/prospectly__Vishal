import { EmailTemplateEditor } from "@/components/EmailTemplateEditor";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Sparkles,
  Send,
  Copy,
  Eye,
  Users,
  Target,
  ArrowRight,
  Award,
  Banknote,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Bounty } from "@/types/bounty";
import { toUTC, utcDayjs } from "@/lib/dayjs";

interface WorkflowProps {
  referral: {
    id: string;
    contactName: string;
    contactTitle: string;
    contactCompany: string;
    contactEmail: string;
    requesterName: string;
    requesterTitle: string;
    requesterCompany: string;
    requesterEmail?: string;
    bountyAmount: number;
    purpose: string;
  };
  onClose: () => void;
  onBountyCreated?: (bounty: Bounty) => void;
}

// Mock LinkedIn data
const mockLinkedInData = {
  "Sarah Johnson": {
    experience:
      "15+ years in SaaS sales leadership, previously VP Sales at DataCorp (grew revenue 300% in 2 years)",
    skills: ["Enterprise Sales", "Team Leadership", "SaaS", "Revenue Growth"],
    recentPosts: [
      "Posted about scaling sales teams in competitive markets",
      "Shared insights on enterprise deal closing",
    ],
    connections: "2,500+ connections",
    industries: ["SaaS", "Enterprise Software", "B2B Sales"],
  },
  "David Kim": {
    experience:
      "10+ years as CTO in fintech, led engineering teams of 50+, expertise in payment systems and blockchain",
    skills: ["Blockchain", "Payment Systems", "Team Leadership", "Fintech"],
    recentPosts: [
      "Discussed future of decentralized finance",
      "Shared thoughts on engineering culture",
    ],
    connections: "1,800+ connections",
    industries: ["Fintech", "Blockchain", "Payment Processing"],
  },
  "Alex Thompson": {
    experience:
      "8+ years in performance marketing, specializes in e-commerce growth and acquisition strategies",
    skills: [
      "Performance Marketing",
      "E-commerce",
      "Growth Hacking",
      "Analytics",
    ],
    recentPosts: [
      "Analyzed latest e-commerce marketing trends",
      "Shared case study on 400% ROAS improvement",
    ],
    connections: "3,200+ connections",
    industries: ["E-commerce", "Digital Marketing", "Growth"],
  },
};

export default function ReferralWorkflow({
  referral,
  onClose,
  onBountyCreated,
}: WorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [emailContent, setEmailContent] = useState("");
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [meetingBooked, setMeetingBooked] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const linkedInData =
    mockLinkedInData[referral.contactName as keyof typeof mockLinkedInData] ||
    mockLinkedInData["Sarah Johnson"];

  const generateAiEmail = async () => {
    setIsGeneratingEmail(true);

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const aiGeneratedEmail = `Subject: Introduction to ${referral.requesterName} from ${referral.requesterCompany}

Hi ${referral.contactName},

I hope this email finds you well! I wanted to reach out regarding an exciting opportunity that aligns perfectly with your expertise in ${linkedInData.skills[0]} and ${linkedInData.skills[1]}.

Given your impressive background leading ${linkedInData.experience.split(",")[0]}, I thought you'd be interested in connecting with ${referral.requesterName}, ${referral.requesterTitle} at ${referral.requesterCompany}.

${referral.requesterName} is looking for someone with your exact profile for an exciting opportunity: ${referral.purpose}

Based on your recent LinkedIn activity where you've been ${linkedInData.recentPosts[0].toLowerCase()}, this seems like it could be a great mutual fit.

Would you be open to a brief 15-minute call with ${referral.requesterName} to explore this further? They're available at your convenience and I'm happy to facilitate the introduction.

A few things that make this particularly relevant:
• Your expertise in ${linkedInData.skills.slice(0, 2).join(" and ")} is exactly what they need
• ${referral.requesterCompany} is in the ${linkedInData.industries[0]} space where you have deep experience
• This could be a great opportunity for career growth and impact

I'll copy ${referral.requesterName} on this email so you can connect directly if you're interested.

Let me know your thoughts!

Best regards,
[Your Name]

P.S. This introduction was facilitated through Prospectly, a platform that helps professionals make meaningful connections. If you're interested in expanding your own network, you can check it out at prospectly.com

---
${referral.requesterName} from ${referral.requesterCompany} has been copied on this email. Looking forward to seeing how this develops!`;

    setEmailContent(aiGeneratedEmail);
    setIsGeneratingEmail(false);
    toast({
      title: "AI Email Generated",
      description:
        "Personalized introduction email created using LinkedIn insights",
    });
  };

  const sendEmail = async () => {
    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Create bounty when email is sent
    const newBounty: Bounty = {
      id: `bounty_${toUTC().valueOf()}`,
      totalAmount: referral.bountyAmount,
      currency: "USD",
      status: "active",
      referrer: {
        id: "current_user",
        name: "Current User", // This would come from auth context
        email: "user@example.com",
      },
      requester: {
        id: `req_${toUTC().valueOf()}`,
        name: referral.requesterName,
        email:
          referral.requesterEmail ||
          `${referral.requesterName.toLowerCase().replace(" ", ".")}@${referral.requesterCompany.toLowerCase().replace(" ", "")}.com`,
        company: referral.requesterCompany,
      },
      prospect: {
        id: `prospect_${toUTC().valueOf()}`,
        name: referral.contactName,
        email: referral.contactEmail,
        company: referral.contactCompany,
      },
      stages: [
        {
          stage: "intro_sent",
          percentage: 20,
          amount: referral.bountyAmount * 0.2,
          status: "released",
          releasedAt: toUTC().toISOString(),
          description: "Introduction email sent",
        },
        {
          stage: "meeting_confirmed",
          percentage: 80,
          amount: referral.bountyAmount * 0.8,
          status: "pending",
          description: "Meeting confirmed & completed",
        },
      ],
      bonusStage: {
        percentage: 50,
        amount: referral.bountyAmount * 0.5,
        status: "pending",
        description: "Deal successfully closed",
      },
      escrowBalance: referral.bountyAmount * 1.5, // Total + bonus
      totalReleased: referral.bountyAmount * 0.2,
      totalPending: referral.bountyAmount * 0.8,
      referralSentAt: toUTC().toISOString(),
      createdAt: toUTC().toISOString(),
      updatedAt: toUTC().toISOString(),
      notes: referral.purpose,
    };

    setEmailSent(true);
    setCurrentStep(3);

    // Notify parent component about bounty creation
    onBountyCreated?.(newBounty);

    toast({
      title: "Email Sent & Referral Payout Created",
      description: `Introduction email sent with $${(referral.bountyAmount * 0.2).toFixed(0)} immediately released to escrow`,
    });
  };

  const bookMeeting = async () => {
    // Simulate meeting booking
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setMeetingBooked(true);
    toast({
      title: "Meeting Booked",
      description: `Meeting scheduled for ${selectedDate} at ${selectedTime}`,
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(emailContent);
    toast({
      title: "Copied to Clipboard",
      description: "Email content copied to clipboard",
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Referral Workflow - {referral.contactName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? "bg-primary text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-600 hover:text-gray-200"}`}
              >
                1
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? "bg-primary text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-600 hover:text-gray-200"}`}
              >
                2
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 3 ? "bg-primary text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-600 hover:text-gray-200"}`}
              >
                3
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Step {currentStep} of 3
            </div>
          </div>

          <Tabs value={currentStep.toString()} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="1" disabled={currentStep < 1}>
                <Brain className="h-4 w-4 mr-2" />
                AI Analysis
              </TabsTrigger>
              <TabsTrigger value="2" disabled={currentStep < 2}>
                <Mail className="h-4 w-4 mr-2" />
                Email Review
              </TabsTrigger>
              <TabsTrigger value="3" disabled={currentStep < 3}>
                <Calendar className="h-4 w-4 mr-2" />
                Meeting Booking
              </TabsTrigger>
            </TabsList>

            {/* Step 1: AI Analysis */}
            <TabsContent value="1" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    AI LinkedIn Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Contact Profile</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${referral.contactName}`}
                            />
                            <AvatarFallback>
                              {referral.contactName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {referral.contactName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {referral.contactTitle}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {referral.contactCompany}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Requester Profile</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${referral.requesterName}`}
                            />
                            <AvatarFallback>
                              {referral.requesterName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {referral.requesterName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {referral.requesterTitle}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {referral.requesterCompany}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      AI Insights from LinkedIn
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium">Experience:</span>
                        <p className="mt-1">{linkedInData.experience}</p>
                      </div>
                      <div>
                        <span className="font-medium">Key Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {linkedInData.skills.map((skill, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Recent Activity:</span>
                        <ul className="mt-1 space-y-1">
                          {linkedInData.recentPosts.map((post, index) => (
                            <li key={index} className="text-muted-foreground">
                              • {post}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-medium">Network:</span>
                        <span className="ml-2">{linkedInData.connections}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2">
                      Match Analysis
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      High compatibility score based on shared industry
                      experience, relevant skills, and career trajectory
                      alignment. The timing appears optimal given recent
                      LinkedIn activity.
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <div className="text-sm text-muted-foreground">
                      Analysis complete • Ready to generate personalized email
                    </div>
                    <Button
                      onClick={() => setCurrentStep(2)}
                      className="ml-auto"
                    >
                      Continue to Email Generation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 2: Email Generation & Review */}
            <TabsContent value="2" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-green-600" />
                    Review Introduction Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <EmailTemplateEditor
                    slug="introduction_email"
                    variables={{
                      targetName: referral.contactName,
                      requesterName: referral.requesterName,
                      connectorName: "there",
                      emailBody: "I thought you two should meet...", // default mock
                      bookingLink: "#",
                      requesterAvatar: `<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${referral.requesterName}" width="56" height="56" style="border-radius: 50%;">`,
                      isTarget: "true",
                    }}
                    initialContent={emailContent}
                    onContentChange={setEmailContent}
                  />

                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Banknote className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-amber-800 dark:text-amber-400">
                          Referral Payout Escrow
                        </div>
                        <div className="text-amber-700 dark:text-amber-300 mt-1">
                          <div>
                            • <strong>Immediate Release (20%):</strong> $
                            {(referral.bountyAmount * 0.2).toFixed(0)} upon
                            email sent
                          </div>
                          <div>
                            • <strong>Meeting Release (80%):</strong> $
                            {(referral.bountyAmount * 0.8).toFixed(0)} when
                            meeting confirmed
                          </div>
                          <div>
                            • <strong>Success Bonus (50%):</strong> $
                            {(referral.bountyAmount * 0.5).toFixed(0)} if deal
                            closes
                          </div>
                          <div className="mt-2 font-medium">
                            Total Escrow: $
                            {(referral.bountyAmount * 1.5).toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      Back to Analysis
                    </Button>
                    <Button
                      onClick={sendEmail}
                      disabled={!emailContent || emailSent}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {emailSent ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Email Sent
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Introduction Email
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 3: Meeting Booking */}
            <TabsContent value="3" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    Meeting Booking & Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {emailSent && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-400">
                          Introduction Email Sent Successfully
                        </span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Email sent to {referral.contactName} with{" "}
                        {referral.requesterName} copied. They can now connect
                        directly to schedule a meeting.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">
                        Schedule Follow-up Meeting
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="meeting-date">Meeting Date</Label>
                          <Input
                            id="meeting-date"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={utcDayjs().format("YYYY-MM-DD")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="meeting-time">Meeting Time</Label>
                          <Select
                            value={selectedTime}
                            onValueChange={setSelectedTime}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="09:00">9:00 AM</SelectItem>
                              <SelectItem value="10:00">10:00 AM</SelectItem>
                              <SelectItem value="11:00">11:00 AM</SelectItem>
                              <SelectItem value="14:00">2:00 PM</SelectItem>
                              <SelectItem value="15:00">3:00 PM</SelectItem>
                              <SelectItem value="16:00">4:00 PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={bookMeeting}
                          disabled={
                            !selectedDate || !selectedTime || meetingBooked
                          }
                          className="w-full"
                        >
                          {meetingBooked ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Meeting Booked
                            </>
                          ) : (
                            <>
                              <Calendar className="h-4 w-4 mr-2" />
                              Book Follow-up Meeting
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Referral Tracking</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">Email Sent</span>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">Response Received</span>
                          <Clock className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">Meeting Scheduled</span>
                          {meetingBooked ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">Referral Payout Earned</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              ${referral.bountyAmount}
                            </Badge>
                            <Clock className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {meetingBooked && (
                    <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-purple-800 dark:text-purple-400">
                          Meeting Scheduled
                        </span>
                      </div>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Follow-up meeting booked for {selectedDate} at{" "}
                        {selectedTime}. You'll be notified once the meeting is
                        completed to track referral payout status.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4">
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                      Back to Email
                    </Button>
                    <Button onClick={onClose} variant="outline">
                      Close Workflow
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
