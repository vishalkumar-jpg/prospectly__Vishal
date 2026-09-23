import { useState, useRef } from "react";
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
  Users,
  ArrowRight,
  Chrome,
  Building,
  Linkedin,
  Smartphone,
  Clock,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { useImportContacts } from "@/hooks/useImportContacts";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import GoogleContactsModal from "@/components/GoogleContactsModal";
import MicrosoftContactsModal from "@/components/MicrosoftContactsModal";
import AppleContactsModal from "@/components/AppleContactsModal";

const importOptions = [
  {
    id: "google-contacts",
    name: "Google Contacts",
    description: "Import from Gmail, Android, or Google Workspace",
    icon: Chrome,
    color: "bg-green-50 border-green-200 hover:bg-green-100",
    textColor: "text-green-700",
    time: "1 minute",
    difficulty: "Easy",
    action: "modal",
  },
  {
    id: "linkedin",
    name: "LinkedIn Connections",
    description: "Access your professional network (Premium)",
    icon: Linkedin,
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    textColor: "text-blue-700",
    time: "2 minutes",
    difficulty: "Medium",
    isPremium: true,
    action: "modal",
  },
  {
    id: "microsoft",
    name: "Microsoft Outlook",
    description: "Import from Outlook, Hotmail, or Office 365",
    icon: Building,
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    textColor: "text-purple-700",
    time: "1 minute",
    difficulty: "Easy",
    action: "modal",
  },
  {
    id: "apple",
    name: "Apple iCloud Contacts",
    description: "Import from iPhone or iCloud",
    icon: Smartphone,
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    textColor: "text-orange-700",
    time: "1 minute",
    difficulty: "Easy",
    action: "modal",
  },
];

export default function GettingStartedStep1() {
  const navigate = useNavigate();
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isMicrosoftModalOpen, setIsMicrosoftModalOpen] = useState(false);
  const [isAppleModalOpen, setIsAppleModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startImport, startFileImport, isImporting } = useImportContacts();

  const handleImportConnect = (optionId: string) => {
    const option = importOptions.find((opt) => opt.id === optionId);
    if (!option) return;

    switch (option.action) {
      case "upload":
        fileInputRef.current?.click();
        break;
      case "modal":
        switch (optionId) {
          case "google-contacts":
            setIsGoogleModalOpen(true);
            break;
          case "microsoft":
            setIsMicrosoftModalOpen(true);
            break;
          case "apple":
            setIsAppleModalOpen(true);
            break;
        }
        break;
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const sessionId = await startFileImport(files);
      if (sessionId) {
        toast({
          title: "Contacts Uploaded!",
          description: `${files.length} file(s) processed successfully. Contacts have been imported.`,
        });
        navigate("/getting-started/step-2");
      }
      event.target.value = "";
    }
  };

  const handleGoogleSuccess = () => {
    startImport("Google Contacts");
    setIsGoogleModalOpen(false);
    navigate("/getting-started/step-2");
  };

  const handleMicrosoftSuccess = () => {
    startImport("Microsoft Outlook");
    setIsMicrosoftModalOpen(false);
    navigate("/getting-started/step-2");
  };

  const handleAppleSuccess = (sessionId?: string, source?: string) => {
    startImport("Apple iCloud");
    setIsAppleModalOpen(false);
    navigate("/getting-started/step-2");
  };

  return (
    <>
      <SEO
        title="Step 1: Import Contacts | Prospectly"
        description="Import your contact lists to start earning through warm introductions."
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
              1
            </div>
            <div>
              <h1 className="text-3xl font-bold">Import Your Contact Lists</h1>
              <p className="text-muted-foreground">
                Upload your contact lists to provide warm introductions to other
                members
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
              <span>$127K+ annually</span>
            </div>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Choose Your Import Method
            </CardTitle>
            <CardDescription>
              Select how you'd like to import your contacts. We never email or
              spam your contacts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Recommended platforms */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Recommended
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleImportConnect("linkedin")}
                    className="flex items-center justify-between p-4 h-auto hover:bg-blue-50 border-blue-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                        <Linkedin className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">LinkedIn</div>
                        <div className="text-xs text-muted-foreground">
                          Professional network
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleImportConnect("google-contacts")}
                    className="flex items-center justify-between p-4 h-auto hover:bg-red-50 border-red-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                        <Chrome className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Google</div>
                        <div className="text-xs text-muted-foreground">
                          Gmail & Workspace
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Other platforms */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Other Platforms
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {importOptions
                    .filter(
                      (opt) => !["linkedin", "google-contacts"].includes(opt.id)
                    )
                    .map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <Button
                          key={option.id}
                          variant="outline"
                          onClick={() => handleImportConnect(option.id)}
                          className={`${option.color} flex items-center justify-between p-4 h-auto`}
                        >
                          <div className="flex items-center space-x-3">
                            <IconComponent
                              className={`w-5 h-5 ${option.textColor}`}
                            />
                            <div className="text-left">
                              <div className="font-medium">{option.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {option.time}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      );
                    })}
                </div>
              </div>

              {/* File upload option */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Manual Upload
                </h3>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 h-auto border-dashed"
                  disabled={isImporting}
                >
                  <div className="flex items-center space-x-3">
                    <Upload className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Upload CSV File</div>
                      <div className="text-xs text-muted-foreground">
                        {isImporting
                          ? "Processing..."
                          : "Drag and drop or click to upload"}
                      </div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Link to="/getting-started">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          multiple
        />

        {/* Modals */}
        <GoogleContactsModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
          onSuccess={handleGoogleSuccess}
        />
        <MicrosoftContactsModal
          isOpen={isMicrosoftModalOpen}
          onClose={() => setIsMicrosoftModalOpen(false)}
          onSuccess={handleMicrosoftSuccess}
        />
        <AppleContactsModal
          isOpen={isAppleModalOpen}
          onClose={() => setIsAppleModalOpen(false)}
          onSuccess={handleAppleSuccess}
        />
      </div>
    </>
  );
}
