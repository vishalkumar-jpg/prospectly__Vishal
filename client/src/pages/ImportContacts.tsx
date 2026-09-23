import { useState, useRef, useEffect, DragEvent } from "react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PrivacyAssurance } from "@/components/PrivacyAssurance";
import { TrustBadges } from "@/components/TrustBadges";
import { ImportProgress } from "@/components/ImportProgress";
import { ImportedContactsModal } from "@/components/ImportedContactsModal";
import { ContactUploadEducationOverlay } from "@/components/ContactUploadEducationOverlay";
import GoogleContactsModal from "@/components/GoogleContactsModal";
import MicrosoftContactsModal from "@/components/MicrosoftContactsModal";
import AppleContactsModal from "@/components/AppleContactsModal";
import { useImportContacts } from "@/hooks/useImportContacts";
import { toast } from "@/hooks/use-toast";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link2, Check, Upload, ArrowLeft, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function ImportContacts() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [connectedAccounts, setConnectedAccounts] = useState({
    google: false,
    microsoft: false,
    icloud: false,
    linkedin: false,
    salesforce: false,
    hubspot: false,
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isEducationOverlayOpen, setIsEducationOverlayOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isMicrosoftModalOpen, setIsMicrosoftModalOpen] = useState(false);
  const [isAppleModalOpen, setIsAppleModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
    importSessions,
    isImporting,
    startImport,
    startFileImport,
    getSessionContacts,
    downloadReport,
  } = useImportContacts();

  const handleConnectAccount = (account: string) => {
    const isConnecting =
      !connectedAccounts[account as keyof typeof connectedAccounts];

    // Special handling for Google to show guided modal
    if (account === "google" && isConnecting) {
      setIsGoogleModalOpen(true);
      return;
    }

    // Special handling for Microsoft to show guided modal
    if (account === "microsoft" && isConnecting) {
      setIsMicrosoftModalOpen(true);
      return;
    }

    // Special handling for Apple to show guided modal
    if (account === "icloud" && isConnecting) {
      setIsAppleModalOpen(true);
      return;
    }

    if (isConnecting) {
      // Start import simulation when connecting
      const sourceNames = {
        google: "Google Contacts",
        microsoft: "Microsoft Outlook",
        icloud: "Apple iCloud",
        yahoo: "Yahoo Mail",
        linkedin: "LinkedIn",
        salesforce: "Salesforce CRM",
        hubspot: "HubSpot CRM",
      };

      startImport(sourceNames[account as keyof typeof sourceNames]);
    }

    setConnectedAccounts((prev) => ({
      ...prev,
      [account]: isConnecting,
    }));

    toast({
      title: isConnecting ? "Account Connected" : "Account Disconnected",
      description: isConnecting
        ? `Your ${account} account has been connected and import started.`
        : `Your ${account} account has been disconnected.`,
    });
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      startFileImport(files);
      // Reset the input so the same file can be selected again
      event.target.value = "";
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      // Filter for accepted file types
      const acceptedTypes = [".csv", ".xlsx", ".xls", ".vcf"];
      const validFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const extension = "." + file.name.split(".").pop()?.toLowerCase();
        if (acceptedTypes.includes(extension)) {
          validFiles.push(file);
        }
      }

      if (validFiles.length > 0) {
        // Create a FileList-like object
        const dataTransfer = new DataTransfer();
        validFiles.forEach((file) => dataTransfer.items.add(file));
        startFileImport(dataTransfer.files);
      } else {
        toast({
          title: "Invalid File Type",
          description:
            "Please upload CSV, Excel (.xlsx, .xls), or vCard (.vcf) files.",
          variant: "destructive",
        });
      }
    }
  };

  const handleViewContacts = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsContactsModalOpen(true);
  };

  const handleDownloadReport = (sessionId: string) => {
    downloadReport(sessionId);
  };

  const connectedCount =
    Object.values(connectedAccounts).filter(Boolean).length;
  const totalAccounts = Object.keys(connectedAccounts).length;
  const isSetupComplete = connectedCount === totalAccounts;

  // Show education overlay on first visit
  useEffect(() => {
    const hasSeenOverlay = localStorage.getItem(
      "prospectly_education_overlay_seen"
    );
    if (!hasSeenOverlay) {
      setIsEducationOverlayOpen(true);
    }
  }, []);

  const handleShowEducationOverlay = () => {
    setIsEducationOverlayOpen(true);
  };

  const handleEducationComplete = () => {
    toast({
      title: "Ready to Import!",
      description: "You can now start uploading your contacts securely.",
    });
  };

  const handleGoogleSuccess = (sessionId: string) => {
    setConnectedAccounts((prev) => ({ ...prev, google: true }));
    setIsGoogleModalOpen(false);
  };

  const handleMicrosoftSuccess = (sessionId: string) => {
    setConnectedAccounts((prev) => ({ ...prev, microsoft: true }));
    setIsMicrosoftModalOpen(false);
  };

  const handleAppleSuccess = (sessionId: string) => {
    setConnectedAccounts((prev) => ({ ...prev, icloud: true }));
    setIsAppleModalOpen(false);
  };

  return (
    <>
      <SEO
        title="Import Contacts | Prospectly"
        description="Connect your accounts and upload contact files to import your network for warm introductions."
      />
      <header className="border-b bg-background">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* Breadcrumb Navigation */}
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/my-contacts">Contacts</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Import Contacts</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-4 mb-4">
            <Link to="/my-contacts">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Contacts
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Import Contacts</h1>
              <p className="text-muted-foreground mt-1">
                Connect your accounts and upload files to build your referral
                network.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowEducationOverlay}
              className="flex items-center gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              How This Works
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Import Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Quick Upload
                </CardTitle>
                <CardDescription>
                  Upload CSV, Excel, or vCard files with your business contacts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-dashed border-2 rounded-lg transition-all ${
                    isDragging
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : "border-primary/25 hover:border-primary/50 bg-primary/5"
                  }`}
                >
                  <div className="p-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                          isDragging ? "bg-primary/20" : "bg-primary/10"
                        }`}
                      >
                        <Upload
                          className={`w-8 h-8 transition-transform ${
                            isDragging
                              ? "text-primary scale-110"
                              : "text-primary"
                          }`}
                        />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium">
                          {isDragging
                            ? "Drop files to upload"
                            : "Drop files here or click to browse"}
                        </h4>
                        <p className="text-muted-foreground">
                          CSV, Excel (.xlsx, .xls), vCard (.vcf) - Up to 10MB
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.vcf"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        size="lg"
                        className="min-w-[200px]"
                        onClick={handleFileUpload}
                        disabled={isImporting}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isImporting
                          ? "Importing..."
                          : "Select Files to Upload"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Connections */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    <CardTitle>Connect Accounts</CardTitle>
                  </div>
                  <Badge variant={isSetupComplete ? "default" : "secondary"}>
                    {connectedCount}/{totalAccounts} connected
                  </Badge>
                </div>
                <CardDescription>
                  Automatically sync contacts from your connected platforms.
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
                        variant={
                          connectedAccounts.google ? "secondary" : "outline"
                        }
                        onClick={() => handleConnectAccount("google")}
                        className="flex items-center justify-between p-4 h-auto"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Google</div>
                            <div className="text-xs text-muted-foreground">
                              Gmail contacts
                            </div>
                          </div>
                        </div>
                        {connectedAccounts.google ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                      </Button>

                      <Button
                        variant={
                          connectedAccounts.microsoft ? "secondary" : "outline"
                        }
                        onClick={() => handleConnectAccount("microsoft")}
                        className="flex items-center justify-between p-4 h-auto"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Microsoft</div>
                            <div className="text-xs text-muted-foreground">
                              Outlook & Office 365
                            </div>
                          </div>
                        </div>
                        {connectedAccounts.microsoft ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                      </Button>

                      <Button
                        variant={
                          connectedAccounts.icloud ? "secondary" : "outline"
                        }
                        onClick={() => handleConnectAccount("icloud")}
                        className="flex items-center justify-between p-4 h-auto"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <div className="font-medium">Apple iCloud</div>
                            <div className="text-xs text-muted-foreground">
                              iPhone/Mac contacts
                            </div>
                          </div>
                        </div>
                        {connectedAccounts.icloud ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Trust & Security */}
          <div className="space-y-6">
            {/* Privacy Assurance - Compact */}
            <PrivacyAssurance variant="inline" />

            {/* Security Badges - Compact */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Security & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <TrustBadges variant="compact" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Education Overlay */}
      <ContactUploadEducationOverlay
        isOpen={isEducationOverlayOpen}
        onClose={() => setIsEducationOverlayOpen(false)}
        onComplete={handleEducationComplete}
      />

      {/* Google Contacts Modal */}
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

      {/* Imported Contacts Modal */}
      {selectedSessionId && (
        <ImportedContactsModal
          isOpen={isContactsModalOpen}
          onClose={() => setIsContactsModalOpen(false)}
          sessionId={selectedSessionId}
          contacts={getSessionContacts(selectedSessionId)}
          sessionSource={
            importSessions.find((s) => s.id === selectedSessionId)?.source || ""
          }
        />
      )}
    </>
  );
}
