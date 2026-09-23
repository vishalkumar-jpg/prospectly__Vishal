import { useRef } from "react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Upload,
  Target,
  Clock,
  TrendingUp,
  ArrowLeft,
  FileText,
  Calendar,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useCalendarIntegration } from "@/hooks/useCalendarIntegration";

export default function GettingStartedStep2() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { connectCalendar, isConnecting, integrations } =
    useCalendarIntegration();

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      toast({
        title: "Prospects Uploaded! 🎯",
        description:
          "Your prospect lists are being analyzed for warm introduction matches.",
      });
      event.target.value = "";
      navigate("/getting-started/step-3");
    }
  };

  return (
    <>
      <SEO
        title="Step 2: Upload Prospects | Prospectly"
        description="Upload your priority prospect lists to get matches from our network."
      />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link
            to="/getting-started"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Getting Started
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <h1 className="text-3xl font-bold">Upload Prospect Lists</h1>
              <p className="text-muted-foreground">
                Upload your priority prospect lists to get matches from our
                network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>2 minutes</span>
            </div>
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <TrendingUp className="h-4 w-4" />
              <span>Priority introductions</span>
            </div>
          </div>
        </div>

        {/* Calendar Integration Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Connect Your Calendar
            </CardTitle>
            <CardDescription>
              Connect your calendar to streamline meeting scheduling and track
              introduction outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Google Calendar */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-red-600" />
                    </div>
                    Google Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => connectCalendar("google")}
                    disabled={
                      isConnecting ||
                      integrations.some((i) => i.provider === "google")
                    }
                    className="w-full"
                    size="sm"
                  >
                    {integrations.some((i) => i.provider === "google")
                      ? "Connected"
                      : "Connect"}
                  </Button>
                </CardContent>
              </Card>

              {/* Microsoft Calendar */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    Microsoft Outlook
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => connectCalendar("microsoft")}
                    disabled={
                      isConnecting ||
                      integrations.some((i) => i.provider === "microsoft")
                    }
                    className="w-full"
                    size="sm"
                  >
                    {integrations.some((i) => i.provider === "microsoft")
                      ? "Connected"
                      : "Connect"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Upload Your Target Prospects
            </CardTitle>
            <CardDescription>
              Upload a list of companies or people you want to connect with.
              We'll find warm introduction paths through our network.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload area */}
            <div
              className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer"
              onClick={handleFileUpload}
            >
              <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Prospect List</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>

            {/* File format info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Supported File Format:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CSV files (.csv)</li>
                <li>
                  • Include columns: Company Name, Contact Name, Email
                  (optional), LinkedIn URL (optional)
                </li>
              </ul>
            </div>

            {/* What happens next */}
            <div className="space-y-3">
              <h4 className="font-medium">What happens next:</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    We analyze your prospect list and match them against our
                    network
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    You receive notifications when warm introduction paths are
                    found
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    Request introductions through our platform and track
                    progress
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Link to="/getting-started/step-1">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous Step
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button onClick={handleFileUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Prospects
            </Button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </>
  );
}
