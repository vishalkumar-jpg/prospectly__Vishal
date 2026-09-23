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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Calendar as CalendarIcon,
  Building,
  DollarSign,
  CheckCircle,
  Link as LinkIcon,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Loader } from "@/components/ui/loader";
import { api } from "@/lib/api";
import { dayjs } from "@/lib/dayjs";

const meetingSchema = z.object({
  scheduledAt: z.string().min(1, "Meeting date and time is required"),
  duration: z
    .number()
    .min(15, "Minimum duration is 15 minutes")
    .max(240, "Maximum duration is 4 hours"),
  meetingPlatform: z.string().optional(),
  meetingLink: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface IntroductionRequest {
  id: string;
  targetName: string;
  targetCompany: string;
  targetRole: string;
  bountyAmount: number;
  status: string;
  requesterName?: string;
}

export default function ScheduleMeeting() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: request, isLoading: requestLoading } =
    useQuery<IntroductionRequest>({
      queryKey: ["/api/introductions", id],
      queryFn: async () => {
        // Use centralized API request which includes proactive token refresh
        const response = await api.introductions.get(Number(id));
        return response.request;
      },
      enabled: !!id,
    });

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      scheduledAt: "",
      duration: 30,
      meetingPlatform: "zoom",
      meetingLink: "",
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data: MeetingFormData) => {
      // Use centralized API request which includes proactive token refresh
      return api.meetings.create({
        requestId: Number(id),
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        meetingPlatform: data.meetingPlatform,
        meetingLink: data.meetingLink,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/introductions"] });
      toast({
        title: "Meeting scheduled!",
        description:
          "The meeting has been confirmed. 95% of the referral payout has been captured.",
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

  const onSubmit = (data: MeetingFormData) => {
    scheduleMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Get minimum datetime (now)
  // Get minimum datetime (now)
  const minDateTime = dayjs().format("YYYY-MM-DDTHH:mm");

  if (requestLoading) {
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

  if (request.status !== "email_sent") {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            This meeting cannot be scheduled yet. Status: {request.status}
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/dashboard")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const meetingPayment = request.bountyAmount * 0.95;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Schedule Meeting</h1>
        <p className="text-muted-foreground">
          Set up the meeting between {request.requesterName} and{" "}
          {request.targetName}
        </p>
      </div>

      {/* Request Details */}
      <Card>
        <CardHeader>
          <CardTitle>Introduction Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold mb-1">Participants</p>
              <div className="bg-muted p-3 rounded-md space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Requester</p>
                  <p className="font-medium">
                    {request.requesterName || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target</p>
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="font-medium">{request.targetName}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building className="h-3 w-3" />
                        <span>{request.targetCompany}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1">Payment Information</p>
              <div className="bg-muted p-3 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Payout:</span>
                  <Badge variant="default" className="text-base font-bold">
                    {formatCurrency(request.bountyAmount)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Already paid (5%):
                  </span>
                  <span className="text-sm line-through">
                    {formatCurrency(request.bountyAmount * 0.05)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm font-semibold">
                    Payment on schedule (95%):
                  </span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(meetingPayment)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
              <CardDescription>
                Schedule the meeting and specify the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="datetime-local"
                          min={minDateTime}
                          className="pl-10"
                          {...field}
                          data-testid="input-scheduled-at"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      When will the meeting take place?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={15}
                        max={240}
                        step={15}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 30)
                        }
                        data-testid="input-duration"
                      />
                    </FormControl>
                    <FormDescription>
                      Meeting duration in minutes (15-240)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meetingPlatform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Platform</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-platform">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="google-meet">Google Meet</SelectItem>
                        <SelectItem value="microsoft-teams">
                          Microsoft Teams
                        </SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="in-person">In Person</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meetingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Link (optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="url"
                          placeholder="https://zoom.us/j/..."
                          className="pl-10"
                          {...field}
                          data-testid="input-meeting-link"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Video conference link or meeting location
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
                disabled={scheduleMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleMutation.isPending}
                data-testid="button-schedule"
              >
                {scheduleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Schedule Meeting
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Payment Notice */}
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              <strong>Payment Release:</strong> When you schedule this meeting,{" "}
              {formatCurrency(meetingPayment)} (95% of referral payout) will be
              captured from the requester and transferred to your account. The
              meeting must be completed for the funds to be finalized.
            </AlertDescription>
          </Alert>
        </form>
      </Form>
    </div>
  );
}
