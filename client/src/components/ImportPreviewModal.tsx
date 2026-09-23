import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, ArrowRight, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useImportProgress } from "@/contexts/ImportProgressContext";
import { apiRequest } from "@/lib/api";
import { ImportModalDots } from "@/components/getting-started/import-modal/dots";
import { ImportModalHero } from "@/components/getting-started/import-modal/hero";
import { ImportModalPrimaryCta } from "@/components/getting-started/import-modal/primaryCta";
import { ImportModalShell } from "@/components/getting-started/import-modal/shell";
import { ImportModalTip } from "@/components/getting-started/import-modal/tip";
import { importModalPreviewDialogContentClassName } from "@/components/getting-started/import-modal/modalStyles";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";

import {
  ImportPreview,
  FieldMapping,
  DB_FIELDS,
  generateImportPreview,
  formatContactImportHeaderForDisplay,
  getContactCsvTemplateHeaders,
  normalizeContactImportHeaders,
  parseCSV,
  transformRowData,
  isValidEmail,
  isValidPhone,
} from "@/utils/csvImport";

const importModalOutlineBtnClassName = cn(
  "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-border bg-background px-5 py-2.5 text-[13px] font-semibold transition-colors hover:border-gs-amethyst/60 sm:w-auto",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
);

const importModalSectionPanelClassName =
  "rounded-[14px] border-[1.5px] border-border bg-muted/40 p-4 sm:p-5";

const CSV_IMPORT_SOURCE = "csv_import";

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onImportComplete: (data: Record<string, string>[]) => void;
  onImportStart?: () => void;
}

export function ImportPreviewModal({
  isOpen,
  onClose,
  file,
  onImportComplete,
  onImportStart,
}: ImportPreviewModalProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"preview" | "mapping">("preview");
  const { startImport, completeImport } = useImportProgress();

  const loadFilePreview = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const content = await file.text();

      if (file.name.endsWith(".csv")) {
        const { headers: rawHeaders, rows } = parseCSV(content);
        const headers = normalizeContactImportHeaders(rawHeaders);
        const importPreview = generateImportPreview(headers, rows);
        setPreview(importPreview);
        setMappings(importPreview.suggestedMappings);
      } else {
        // For Excel files, you'd need a library like xlsx
        toast({
          title: "Excel Support",
          description:
            "Excel file support will be added soon. Please use CSV format for now.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "File Error",
        description: "Failed to parse the file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (file && isOpen) {
      setStep("preview"); // Reset to preview when modal opens
      loadFilePreview();
    }
  }, [file, isOpen, loadFilePreview]);

  const updateMapping = (csvField: string, dbField: string) => {
    setMappings((prev) => {
      const updated = prev.map((mapping) => {
        if (mapping.csvField === csvField) {
          return {
            ...mapping,
            dbField,
            confidence: dbField ? 1.0 : 0,
          };
        }
        // If we're reassigning this dbField, clear it from other mappings
        if (mapping.dbField === dbField && mapping.csvField !== csvField) {
          return {
            ...mapping,
            dbField: "",
            confidence: 0,
          };
        }
        return mapping;
      });

      // Add new mapping if it doesn't exist
      if (!updated.find((m) => m.csvField === csvField)) {
        updated.push({
          csvField,
          dbField,
          confidence: 1.0,
          required: Object.keys(DB_FIELDS).includes(dbField)
            ? DB_FIELDS[dbField as keyof typeof DB_FIELDS].required
            : false,
        });
      }

      return updated;
    });
  };

  const validateMappings = (): string[] => {
    const errors: string[] = [];

    // Check required fields
    const requiredFields = Object.entries(DB_FIELDS)
      .filter(([, config]) => config.required)
      .map(([field]) => field);

    const mappedRequired = mappings
      .filter(
        (m) => m.dbField && m.csvField && requiredFields.includes(m.dbField)
      )
      .map((m) => m.dbField);

    const missingRequired = requiredFields.filter(
      (field) => !mappedRequired.includes(field)
    );

    if (missingRequired.length > 0) {
      errors.push(`Missing required fields: ${missingRequired.join(", ")}`);
    }

    return errors;
  };

  const proceedToMapping = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setStep("mapping");
  };

  const startImportHandler = async () => {
    const validationErrors = validateMappings();
    if (validationErrors.length > 0) {
      toast({
        title: "Mapping Issues",
        description: validationErrors[0],
        variant: "destructive",
      });
      return;
    }

    if (!preview || !file) return;

    // Close the modal immediately - global popup will show progress
    const fileToProcess = file;
    const currentMappings = [...mappings];

    // Notify parent that import has started (e.g., to close parent modal)
    onImportStart?.();

    onClose();

    // Run import in background
    try {
      const content = await fileToProcess.text();
      const { headers: rawHeaders, rows } = parseCSV(content);
      const headers = normalizeContactImportHeaders(rawHeaders);

      // Start global import progress tracking with normalized headers
      const globalImportId = startImport(
        `CSV: ${fileToProcess.name}`,
        rows.length,
        headers
      );

      // Phase 1: Transform all rows first (fast, no progress needed)
      const transformedData: Record<string, string>[] = [];
      const transformErrors: {
        message: string;
        contactData: Record<string, string>;
        rowIndex: number;
      }[] = [];
      const failedContactsData: Record<string, string>[] = [];

      rows.forEach((row, index) => {
        try {
          const transformed = transformRowData(row, headers, currentMappings);

          // Create original row data object with all columns
          const originalRowData: Record<string, string> = {};
          headers.forEach((header, colIndex) => {
            originalRowData[header] = row[colIndex] || "";
          });

          if (transformed.email && !isValidEmail(transformed.email)) {
            transformErrors.push({
              message: `Row ${index + 2}: Invalid email format`,
              contactData: originalRowData,
              rowIndex: index + 2,
            });
            failedContactsData.push(originalRowData);
            return;
          }

          if (
            transformed.phone_number &&
            !isValidPhone(transformed.phone_number)
          ) {
            transformErrors.push({
              message: `Row ${index + 2}: Invalid phone number format`,
              contactData: originalRowData,
              rowIndex: index + 2,
            });
            failedContactsData.push(originalRowData);
            return;
          }

          // Require first_name AND (email OR phone_number OR linkedin)
          if (
            transformed.first_name &&
            (transformed.email ||
              transformed.phone_number ||
              transformed.linkedin)
          ) {
            // Filter to only include allowed fields according to ImportContactItemDto
            const allowedFields = [
              "first_name",
              "last_name",
              "email",
              "phone_number",
              "company",
              "title",
              "industry",
              "city",
              "state",
              "country",
              "linkedin",
              "website",
              "secondary_email",
              "profile_photo_url",
            ];
            const filteredTransformed: Record<string, string> = {};
            allowedFields.forEach((field) => {
              if (transformed[field] !== undefined) {
                filteredTransformed[field] = transformed[field];
              }
            });
            transformedData.push(filteredTransformed);
          } else {
            transformErrors.push({
              message: `Row ${index + 2}: Missing required fields (first_name and either email, phone_number, or linkedin)`,
              contactData: originalRowData,
              rowIndex: index + 2,
            });
            failedContactsData.push(originalRowData);
          }
        } catch (error) {
          // Create original row data object with all columns
          const originalRowData: Record<string, string> = {};
          headers.forEach((header, colIndex) => {
            originalRowData[header] = row[colIndex] || "";
          });
          transformErrors.push({
            message: `Row ${index + 2}: ${error instanceof Error ? error.message : String(error)}`,
            contactData: originalRowData,
            rowIndex: index + 2,
          });
          failedContactsData.push(originalRowData);
        }
      });

      if (transformedData.length === 0) {
        throw new Error("No valid contacts found to import");
      }

      // Phase 2: Send ALL contacts in a single API request
      // Server handles internal batching (50 per batch) for performance
      const allErrors: {
        message: string;
        contactData: Record<string, string>;
        rowIndex?: number;
      }[] = [...transformErrors];
      const allFailedContactsData: Record<string, string>[] = [
        ...failedContactsData,
      ];
      let totalImported = 0;
      let totalUpdated = 0;
      let totalDuplicates = 0;

      try {
        const data = await apiRequest<{
          imported: number;
          updated: number;
          duplicates: number;
          errorMessages?: string[];
        }>("/contacts/import-csv", {
          method: "POST",
          body: JSON.stringify({
            contacts: transformedData,
            source: CSV_IMPORT_SOURCE,
          }),
        });

        totalImported = data.imported || 0;
        totalUpdated = data.updated || 0;
        totalDuplicates = data.duplicates || 0;

        // Parse server error messages and match with contact data
        if (data.errorMessages && data.errorMessages.length > 0) {
          data.errorMessages.forEach((errorMsg: string) => {
            // Try to extract row number from error message
            const rowMatch = errorMsg.match(/Row\s+(\d+):/i);
            const rowNum = rowMatch ? parseInt(rowMatch[1]) : null;

            // Find the corresponding contact data if we have row number
            const contactData: Record<string, string> = {};
            if (rowNum && rowNum <= rows.length) {
              const rowIndex = rowNum - 2; // Convert to 0-based index (rowNum includes header)
              if (rowIndex >= 0 && rowIndex < rows.length) {
                headers.forEach((header, colIndex) => {
                  contactData[header] = rows[rowIndex][colIndex] || "";
                });
              }
            }

            allErrors.push({
              message: errorMsg,
              contactData,
              rowIndex: rowNum || undefined,
            });

            if (Object.keys(contactData).length > 0) {
              allFailedContactsData.push(contactData);
            }
          });
        }
      } catch (importError: unknown) {
        allErrors.push({
          message:
            importError instanceof Error
              ? importError.message
              : String(importError),
          contactData: {},
        });
        throw importError;
      }

      // Update global import progress
      completeImport(globalImportId, {
        imported: totalImported,
        updated: totalUpdated,
        duplicates: totalDuplicates,
        errors: allErrors.length,
        errorMessages: allErrors.map((e) => e.message),
        failedContactsData: allFailedContactsData,
        originalHeaders: headers,
      });

      onImportComplete(transformedData);
    } catch (error: unknown) {
      toast({
        title: "Import Error",
        description:
          error instanceof Error ? error.message : "Failed to import contacts",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const templateHeaders = getContactCsvTemplateHeaders();
    const csvContent =
      templateHeaders.join(",") +
      "\n" +
      "John,Doe,john.doe@example.com,(555) 123-4567,Acme Corp,Sales Manager,Technology,San Francisco,CA,USA,https://linkedin.com/in/johndoe,https://acme.com,john.personal@gmail.com";

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prospect-list-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "Use this template to format your prospect data correctly.",
    });
  };

  const accessibilityTitle =
    step === "preview"
      ? "Import Prospects — Step 1: File Preview"
      : "Import Prospects — Step 2: Field Mapping";

  const handleShellOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  return (
    <ImportModalShell
      open={isOpen}
      onOpenChange={handleShellOpenChange}
      accessibilityTitle={accessibilityTitle}
      dialogContentClassName={importModalPreviewDialogContentClassName}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
      mobileFullscreen
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto thin-scroll">
        <ImportModalDots activeIndex={step === "preview" ? 0 : 1} total={2} />
        <ImportModalHero
          variant="upload"
          icon={<FileText className="h-8 w-8" aria-hidden />}
          title="Import Prospects"
          description={
            step === "preview"
              ? "Step 1: File Preview — confirm your source and preview rows."
              : "Step 2: Field Mapping — match each column to a contact field."
          }
        />

        <div className="min-h-0 flex-1 space-y-3 sm:space-y-5">
          {isLoading && (
            <Loader message="Loading file preview..." className="py-8" />
          )}

          {step === "preview" && preview && !isLoading && (
            <div className="space-y-4 sm:space-y-5">
              <div className={importModalSectionPanelClassName}>
                <h4 className="mb-3 text-base font-bold text-foreground">
                  Import Source
                </h4>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                  <span className="text-sm font-medium text-foreground">
                    Source:
                  </span>
                  <span className="text-sm text-muted-foreground">CSV</span>
                </div>
              </div>

              <div className={importModalSectionPanelClassName}>
                <h4 className="mb-3 text-base font-bold text-foreground">
                  All Data ({preview.totalRows} Rows)
                </h4>
                <div className="relative max-h-96 overflow-x-auto overflow-y-auto thin-scroll rounded-lg border border-border bg-background">
                  <table className="w-full caption-bottom border-collapse text-sm">
                    <thead className="sticky top-0 z-20 border-b bg-background shadow-sm [&_tr]:border-b">
                      <tr className="border-b bg-muted/50 transition-colors hover:bg-muted/50">
                        <th className="h-12 min-w-16 bg-background px-4 text-left align-middle font-medium text-muted-foreground">
                          #
                        </th>
                        {preview.headers.map((header, index) => (
                          <th
                            key={index}
                            className="h-12 min-w-32 bg-background px-4 text-left align-middle font-medium text-muted-foreground"
                            title={header}
                          >
                            {formatContactImportHeaderForDisplay(header)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {preview.sampleData.map((row, index) => (
                        <tr
                          key={index}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle font-medium">
                            {index + 1}
                          </td>
                          {preview.headers.map((header, colIndex) => (
                            <td
                              key={colIndex}
                              className="max-w-32 truncate p-4 align-middle"
                            >
                              {row[header] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:gap-3">
                <button
                  type="button"
                  className={importModalOutlineBtnClassName}
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden />
                  Download Template
                </button>
                <ImportModalPrimaryCta
                  type="button"
                  className="sm:w-auto sm:max-w-xs sm:flex-none"
                  onClick={proceedToMapping}
                >
                  Review Field Mapping →
                </ImportModalPrimaryCta>
              </div>
            </div>
          )}

          {step === "mapping" && preview && (
            <div className="space-y-3 sm:space-y-5">
              <ImportModalTip icon={<Zap className="h-3.5 w-3.5" />}>
                Review and adjust the field mappings below. Required fields are
                marked with a red badge.
              </ImportModalTip>

              <div className={importModalSectionPanelClassName}>
                <h4 className="mb-3 text-base font-bold text-foreground">
                  Field Mapping
                </h4>
                <div className="max-h-[min(24rem,50vh)] space-y-3 overflow-y-auto thin-scroll pr-1 sm:max-h-[min(28rem,55vh)]">
                  {preview.headers.map((header, index) => {
                    const mapping = mappings.find((m) => m.csvField === header);
                    const confidence = mapping?.confidence || 0;

                    return (
                      <div
                        key={index}
                        className="flex flex-col gap-2 rounded-[14px] border-[1.5px] border-border bg-background p-3 sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate font-medium"
                            title={header}
                            aria-label={formatContactImportHeaderForDisplay(
                              header
                            )}
                          >
                            {formatContactImportHeaderForDisplay(header)}
                          </div>
                          <div
                            className="truncate text-sm text-muted-foreground"
                            title={`Sample: ${preview.sampleData[0]?.[header] || "No data"}`}
                            aria-label={`Sample: ${preview.sampleData[0]?.[header] || "No data"}`}
                          >
                            Sample:{" "}
                            {preview.sampleData[0]?.[header] || "No data"}
                          </div>
                        </div>

                        <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />

                        <div className="flex flex-1 items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <Select
                              value={mapping?.dbField || "skip"}
                              onValueChange={(value) =>
                                updateMapping(
                                  header,
                                  value === "skip" ? "" : value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select database field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="skip">
                                  Don&apos;t import
                                </SelectItem>
                                {Object.entries(DB_FIELDS).map(
                                  ([field, config]) => (
                                    <SelectItem key={field} value={field}>
                                      {formatContactImportHeaderForDisplay(
                                        field
                                      )}
                                      {config.required && (
                                        <Badge
                                          variant="destructive"
                                          className="ml-2 text-xs"
                                        >
                                          Required
                                        </Badge>
                                      )}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {confidence > 0 && (
                            <Badge
                              variant={
                                confidence > 0.8 ? "default" : "secondary"
                              }
                              className="shrink-0 whitespace-nowrap"
                            >
                              {Math.round(confidence * 100)}% match
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:gap-3">
                <button
                  type="button"
                  className={importModalOutlineBtnClassName}
                  onClick={() => setStep("preview")}
                >
                  Back to Preview
                </button>
                <ImportModalPrimaryCta
                  type="button"
                  className="sm:w-auto sm:max-w-xs sm:flex-none"
                  onClick={startImportHandler}
                >
                  Start Import →
                </ImportModalPrimaryCta>
              </div>
            </div>
          )}
        </div>
      </div>
    </ImportModalShell>
  );
}
