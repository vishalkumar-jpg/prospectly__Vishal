import { useRef, useState, useEffect } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { toast } from "@/hooks/use-toast";
import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { ImportModalHero } from "@/components/getting-started/import-modal/hero";
import { ImportModalPrimaryCta } from "@/components/getting-started/import-modal/primaryCta";
import { ImportModalShell } from "@/components/getting-started/import-modal/shell";
import { ImportModalTip } from "@/components/getting-started/import-modal/tip";
import { ImportModalUploadZone } from "@/components/getting-started/import-modal/uploadZone";
import { GettingStartedIconBadge } from "@/assets/getting-started/getting-started-icon-badge";

const ACCEPTED_EXT = [".csv"] as const;

function extensionOf(file: File): string {
  return "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
}

interface GettingStartedCsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileAccepted: (file: File) => void;
  onDownloadTemplate: () => void;
}

/**
 * CSV / spreadsheet upload entry (shell). Clicking the CSV tile opens this first;
 * file is then passed to ImportPreviewModal. Drop on the source card may bypass this
 * and open the preview directly (see GettingStarted).
 */
export function GettingStartedCsvImportModal({
  open,
  onOpenChange,
  onFileAccepted,
  onDownloadTemplate,
}: GettingStartedCsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setIsDragOver(false);
    }
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const tryAcceptFile = (f: File) => {
    const ext = extensionOf(f);
    if (!ACCEPTED_EXT.includes(ext as (typeof ACCEPTED_EXT)[number])) {
      toast({
        title: "Invalid File Type",
        description:
          "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }
    setFile(f);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) tryAcceptFile(f);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) tryAcceptFile(f);
  };

  const handleConfirm = () => {
    if (!file) return;
    onFileAccepted(file);
    onOpenChange(false);
  };

  return (
    <ImportModalShell
      open={open}
      onOpenChange={handleOpenChange}
      accessibilityTitle="Upload a CSV or spreadsheet to import contacts"
    >
      <ImportModalDots activeIndex={0} total={3} />
      <ImportModalHero
        variant="upload"
        icon={<GettingStartedIconBadge name="file" size="hero" bare />}
        title="Upload a CSV file"
        description={
          <>
            Import contacts from any spreadsheet. Need a template?{" "}
            <button
              type="button"
              className="font-semibold text-gs-amethyst underline-offset-2 hover:underline"
              onClick={onDownloadTemplate}
            >
              Download here
            </button>
          </>
        }
      />
      <ImportModalUploadZone
        isDragOver={isDragOver}
        hasFile={!!file}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        onClick={file ? undefined : () => inputRef.current?.click()}
        browseLabel="Open file picker for CSV"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="text-[32px] leading-none" aria-hidden>
          <GettingStartedIconBadge name="folder" size="lg" />
        </div>
        <h4 className="text-[15px] font-bold text-foreground">
          Drop your file here
        </h4>
        <p className="text-xs text-muted-foreground">
          or click to browse — accepts .csv
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-border bg-background px-5 py-2 text-[13px] font-semibold transition-colors hover:border-gs-amethyst/60"
        >
          Choose File
        </button>
        {file ? (
          <p className="mt-2 text-xs font-medium text-foreground">{file.name}</p>
        ) : null}
      </ImportModalUploadZone>
      <ImportModalTip icon={<GettingStartedIconBadge name="clipboard" size="sm" />}>
        Your CSV should include:{" "}
        <strong>Name, Email, Company, Title</strong> (at minimum name + email).
      </ImportModalTip>
      <ImportModalPrimaryCta
        type="button"
        disabled={!file}
        onClick={handleConfirm}
      >
        Upload &amp; Import →
      </ImportModalPrimaryCta>
    </ImportModalShell>
  );
}
