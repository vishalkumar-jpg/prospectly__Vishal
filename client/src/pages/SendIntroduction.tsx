import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Send,
  User,
  Building,
  Mail,
  DollarSign,
  Info,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Loader } from "@/components/ui/loader";
import { api } from "@/lib/api";

const emailSchema = z.object({
  introductionText: z
    .string()
    .min(50, "Introduction email must be at least 50 characters")
    .max(2000, "Introduction email must be less than 2000 characters"),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface IntroductionRequest {
  id: string;
  targetName: string;
  targetCompany: string;
  targetRole: string;
  targetEmail?: string;
  bountyAmount: number;
  introductionReason: string;
  backgroundInfo?: string;
  status: string;
  requesterName?: string;
}

export default function SendIntroduction() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [preview, setPreview] = useState(false);

  const { data: request, isLoading } = useQuery<IntroductionRequest>({
    queryKey: ["/api/introductions", id],
    queryFn: async () => {
      // Use centralized API request which includes proactive token refresh
      const response = await api.introductions.get(Number(id));
      return response.request;
    },
    enabled: !!id,
  });

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      introductionText: request
        ? `Hi ${request.targetName},\n\nI wanted to introduce you to ${request.requesterName || "[Requester]"}, who is interested in connecting with you regarding ${request.introductionReason}.\n\n${request.backgroundInfo ? `Background: ${request.backgroundInfo}\n\n` : ""}I think this could be a valuable connection for both of you.\n\nWould you be open to a brief introductory call?\n\nBest regards`
        : "",
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      // Use centralized API request which includes proactive token refresh
      return api.emails.send({
        requestId: Number(id),
        introductionText: data.introductionText,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/introductions"] });
      toast({
        title: "Introduction sent!",
        description:
          "The introduction email has been delivered. You've earned 5% of the referral payout.",
      });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailFormData) => {
    sendEmailMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!request) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Request not found</p>
            <Button onClick={() => navigate("/dashboard")} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (request.status !== "accepted") {
    return (
      <div className="p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This request cannot be sent yet. Status: {request.status}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/dashboard")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const emailDeliveryBounty = request.bountyAmount * 0.05;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Send Introduction</h1>
        <p className="text-muted-foreground">
          Craft and send the introduction email to {request.targetName}
        </p>
      </div>

      {/* Request Details */}
      <Card>
        <CardHeader>
          <CardTitle>Introduction Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold mb-1">Target Contact</p>
              <div className="bg-muted p-3 rounded-md space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{request.targetName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{request.targetCompany}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{request.targetRole}</span>
                </div>
                {request.targetEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{request.targetEmail}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1">Bounty Information</p>
              <div className="bg-muted p-3 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Bounty:</span>
                  <Badge variant="default" className="text-base font-bold">
                    {formatCurrency(request.bountyAmount)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">On Email Delivery (5%):</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(emailDeliveryBounty)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Before Meeting (95%):</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(request.bountyAmount * 0.95)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-1">Introduction Purpose</p>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {request.introductionReason}
            </p>
          </div>

          {request.backgroundInfo && (
            <div>
              <p className="text-sm font-semibold mb-1">Requester Background</p>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {request.backgroundInfo}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Composer */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compose Introduction Email</CardTitle>
              <CardDescription>
                Write a compelling introduction that highlights the value of
                this connection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="introductionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your introduction email..."
                        className="min-h-[300px] font-mono text-sm"
                        {...field}
                        data-testid="textarea-introduction"
                      />
                    </FormControl>
                    <FormDescription>
                      Craft a professional email that makes a strong case for
                      why {request.targetName} should take the meeting. The
                      email will be sent from your email address.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={sendEmailMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPreview(!preview)}
                  disabled={sendEmailMutation.isPending}
                  data-testid="button-preview"
                >
                  {preview ? "Edit" : "Preview"}
                </Button>
                <Button
                  type="submit"
                  disabled={sendEmailMutation.isPending}
                  data-testid="button-send"
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Introduction
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Preview */}
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
                <CardDescription>
                  How your introduction email will appear
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-md">
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm font-semibold">
                      To: {request.targetEmail || request.targetName}
                    </p>
                    <p className="text-sm font-semibold">
                      Subject: Introduction Request
                    </p>
                  </div>
                  <div
                    className="whitespace-pre-wrap text-sm"
                    data-testid="preview-content"
                  >
                    {form.getValues("introductionText")}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              <strong>Payment Release:</strong> When you send this introduction
              email, {formatCurrency(emailDeliveryBounty)} (5% of bounty) will
              be captured and transferred to your account. The remaining{" "}
              {formatCurrency(request.bountyAmount * 0.95)} (95%) will be
              released before the scheduled meeting.
            </AlertDescription>
          </Alert>
        </form>
      </Form>
    </div>
  );
}
