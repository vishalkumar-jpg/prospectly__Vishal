import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  type DragEvent,
} from "react";
import { toast } from "@/hooks/use-toast";
import { useLinkedInImport } from "@/hooks/useLinkedInImport";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { ImportModalProgressPanel } from "@/components/getting-started/import-modal/progressPanel";
import { ImportModalShell } from "@/components/getting-started/import-modal/shell";
import { LinkedInImportExportStep } from "@/components/getting-started/import-modal/linkedinExportStep";
import { LinkedInImportEmailStep } from "@/components/getting-started/import-modal/linkedinEmailStep";
import { LinkedInImportUploadStep } from "@/components/getting-started/import-modal/linkedinUploadStep";

type LinkedInStep = "export" | "email" | "upload" | "uploading";

interface LinkedInImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function initialStepFromConfig(tab?: string | null): LinkedInStep {
  return tab === "upload_zip" ? "upload" : "export";
}

export default function LinkedInImportModal({
  isOpen,
  onClose,
  onSuccess,
}: LinkedInImportModalProps) {
  const { user, updateUserConfiguration } = useAuth();
  const [step, setStep] = useState<LinkedInStep>(() =>
    initialStepFromConfig(user?.userConfiguration?.linkedinImportTab)
  );
  const [prevStep, setPrevStep] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    uploadLinkedInZip,
    isUploading,
    uploadPhase,
    uploadErrorStep,
  } = useLinkedInImport();

  useEffect(() => {
    if (isOpen && user?.userConfiguration?.linkedinImportTab) {
      setStep(initialStepFromConfig(user.userConfiguration.linkedinImportTab));
    }
  }, [isOpen, user?.userConfiguration?.linkedinImportTab]);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setIsDragOver(false);
      setPrevStep(null);
    }
  }, [isOpen]);

  const handleClose = useCallback(async () => {
    if (step !== "uploading") {
      const configValue = step === "upload" ? "upload_zip" : "instructions";
      if (configValue !== user?.userConfiguration?.linkedinImportTab) {
        try {
          const response = await api.profiles.updateConfiguration({
            linkedinImportTab: configValue,
          });
          if (response) {
            updateUserConfiguration(response);
          }
        } catch {
          // Silently ignored
        }
      }
    }
    onClose();
  }, [
    onClose,
    step,
    updateUserConfiguration,
    user?.userConfiguration?.linkedinImportTab,
  ]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        void handleClose();
      }
    },
    [handleClose]
  );

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a ZIP file downloaded from LinkedIn.",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setStep("upload");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStep("uploading");
    try {
      const result = await uploadLinkedInZip(file);
      if (result?.success) {
        analytics.trackContactsUploaded({
          source: "linkedin",
          countImported: 0,
          countFailed: 0,
          durationMs: 0,
        });
        toast({
          title: "Upload Started!",
          description:
            "Your LinkedIn data is being processed. This may take a few minutes.",
        });
        onSuccess?.();
        onClose();
      } else {
        throw new Error(result?.error || "Upload failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setStep("upload");
    }
  };

  return (
    <ImportModalShell
      open={isOpen}
      onOpenChange={handleOpenChange}
      accessibilityTitle="Import LinkedIn connections"
    >
      {step === "export" && (
        <LinkedInImportExportStep
          onRequestedData={() => setStep("email")}
          onAlreadyHaveZip={() => {
            setPrevStep("export");
            setStep("upload");
          }}
        />
      )}
      {step === "email" && (
        <LinkedInImportEmailStep
          onDownloaded={() => {
            setPrevStep("email");
            setStep("upload");
          }}
          onBack={() => setStep("export")}
        />
      )}
      {step === "upload" && (
        <LinkedInImportUploadStep
          file={file}
          isDragOver={isDragOver}
          fileInputRef={fileInputRef}
          isUploading={isUploading}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileChange={handleFileChange}
          onClearAndPick={() => {
            setFile(null);
            fileInputRef.current?.click();
          }}
          onBrowseClick={() => fileInputRef.current?.click()}
          onUpload={handleUpload}
          onBack={() => setStep((prevStep ?? "email") as LinkedInStep)}
        />
      )}
      {step === "uploading" && (
        <ImportModalProgressPanel
          mode="file_upload"
          checklistVariant="linkedin_zip"
          providerName="LinkedIn"
          linkedinZipPhase={uploadPhase}
          linkedinZipErrorStep={uploadErrorStep}
          totalDots={4}
          activeDotIndex={3}
        />
      )}
    </ImportModalShell>
  );
}
