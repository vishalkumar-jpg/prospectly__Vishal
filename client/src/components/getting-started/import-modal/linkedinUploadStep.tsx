import type { DragEvent, ChangeEvent, RefObject } from "react";
import { FileText, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { ImportModalHero } from "@/components/getting-started/import-modal/hero";
import { ImportModalPrimaryCta } from "@/components/getting-started/import-modal/primaryCta";
import { ImportModalTextButton } from "@/components/getting-started/import-modal/textButton";
import { ImportModalTip } from "@/components/getting-started/import-modal/tip";
import { ImportModalUploadZone } from "@/components/getting-started/import-modal/uploadZone";
import { GettingStartedIconBadge } from "@/assets/getting-started/getting-started-icon-badge";

interface LinkedInImportUploadStepProps {
  file: File | null;
  isDragOver: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearAndPick: () => void;
  onBrowseClick: () => void;
  onUpload: () => void;
  onBack: () => void;
}

export function LinkedInImportUploadStep({
  file,
  isDragOver,
  fileInputRef,
  isUploading,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileChange,
  onClearAndPick,
  onBrowseClick,
  onUpload,
  onBack,
}: LinkedInImportUploadStepProps) {
  return (
    <>
      <ImportModalDots activeIndex={2} total={4} />
      <ImportModalHero
        variant="upload"
        icon={<GettingStartedIconBadge name="upload" size="hero" bare />}
        title="Upload your LinkedIn file"
        description="Drop the ZIP file you downloaded from LinkedIn."
      />
      <ImportModalUploadZone
        isDragOver={isDragOver}
        hasFile={!!file}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={file ? undefined : onBrowseClick}
        browseLabel="Open file picker to select LinkedIn ZIP export"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={onFileChange}
          className="hidden"
        />
        {file ? (
          <div className="space-y-2">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <p className="font-semibold text-foreground">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <Button variant="outline" size="sm" type="button" onClick={onClearAndPick}>
              Choose different file
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center" aria-hidden>
              <GettingStartedIconBadge name="folder" size="lg" />
            </div>
            <h4 className="text-[15px] font-bold text-foreground">
              Drop your ZIP file here
            </h4>
            <p className="text-xs text-muted-foreground">
              or click to browse your files
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBrowseClick();
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-border bg-background px-5 py-2 text-[13px] font-semibold transition-colors hover:border-gs-amethyst/60"
            >
              <FileText className="h-4 w-4" />
              Select ZIP File
            </button>
            <p className="pt-1 text-[11px] text-muted-foreground">
              Maximum file size: 50MB
            </p>
          </div>
        )}
      </ImportModalUploadZone>
      <ImportModalTip icon={<GettingStartedIconBadge name="shield" size="sm" />}>
        <strong>Encrypted:</strong> We extract only names and titles. Your file
        is deleted after processing.
      </ImportModalTip>
      <ImportModalPrimaryCta
        type="button"
        disabled={!file || isUploading}
        onClick={onUpload}
      >
        {isUploading ? (
          <>
            <Upload className="mr-2 inline h-4 w-4 animate-pulse" />
            Uploading...
          </>
        ) : (
          <>Upload &amp; Import →</>
        )}
      </ImportModalPrimaryCta>
      <ImportModalTextButton type="button" onClick={onBack}>
        ← Go back
      </ImportModalTextButton>
    </>
  );
}
