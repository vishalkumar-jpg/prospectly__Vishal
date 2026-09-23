import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Download,
} from "lucide-react";
import {
  useImportProgress,
  ImportProgress,
  type ImportError,
} from "@/contexts/ImportProgressContext";
import { cn } from "@/lib/utils";
import { toUTC } from "@/lib/dayjs";
import type { AnyType } from "@/types/common";

function escapeCsvValue({
  value,
}: {
  value: string | number | undefined | null;
}): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseImportErrorRowNumber({ error }: { error: ImportError }): string {
  const rowMatch = error.message.match(/Row\s+(\d+):/i);
  if (rowMatch) return rowMatch[1];
  return error.row ? String(error.row) : "";
}

function parseImportErrorReason({ error }: { error: ImportError }): string {
  return error.message.replace(/^Row\s+\d+:\s*/i, "").trim();
}

function parseContactFieldsFromError({ error }: { error: ImportError }): {
  contactName: string;
  email: string;
} {
  let contactName = "";
  let email = "";
  if (!error.contact) return { contactName, email };
  const contactMatch = error.contact.match(/(.+?)\s*<(.+?)>/);
  if (contactMatch) {
    contactName = contactMatch[1].trim();
    email = contactMatch[2].trim();
  } else if (error.contact.includes("@")) {
    email = error.contact.trim();
  } else {
    contactName = error.contact.trim();
  }
  return { contactName, email };
}

function buildRowFromOriginalHeaders({
  originalHeaders,
  contactData,
  errorReason,
}: {
  originalHeaders: string[];
  contactData: Record<string, AnyType>;
  errorReason: string;
}): string {
  const rowData = originalHeaders.map((header) =>
    escapeCsvValue({ value: String(contactData[header] || "") })
  );
  rowData.push(escapeCsvValue({ value: errorReason }));
  return rowData.join(",");
}

function buildSimpleErrorCsvRow({
  rowNumber,
  contactName,
  email,
  errorReason,
}: {
  rowNumber: string;
  contactName: string;
  email: string;
  errorReason: string;
}): string {
  return [
    rowNumber,
    escapeCsvValue({ value: contactName }),
    escapeCsvValue({ value: email }),
    escapeCsvValue({ value: errorReason }),
  ].join(",");
}

function appendImportErrorCsvRow({
  error,
  errorIndex,
  import_,
  csvRows,
  hasOriginalHeaders,
  originalHeaders,
}: {
  error: ImportError;
  errorIndex: number;
  import_: ImportProgress;
  csvRows: string[];
  hasOriginalHeaders: boolean;
  originalHeaders: string[];
}): void {
  const rowNumber = parseImportErrorRowNumber({ error });
  const errorReason = parseImportErrorReason({ error });

  if (hasOriginalHeaders && error.contactData) {
    csvRows.push(
      buildRowFromOriginalHeaders({
        originalHeaders,
        contactData: error.contactData,
        errorReason,
      })
    );
    return;
  }

  const failedData = import_.failedContactsData?.[errorIndex];
  if (failedData && hasOriginalHeaders) {
    csvRows.push(
      buildRowFromOriginalHeaders({
        originalHeaders,
        contactData: failedData,
        errorReason,
      })
    );
    return;
  }

  let { contactName, email } = parseContactFieldsFromError({ error });
  if (failedData) {
    if (!email && failedData.email) email = String(failedData.email);
    if (!contactName && (failedData.first_name || failedData.last_name)) {
      contactName =
        `${failedData.first_name || ""} ${failedData.last_name || ""}`.trim();
    }
  }
  if (!email) {
    const emailMatch = error.message.match(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    );
    if (emailMatch) email = emailMatch[1];
  }

  csvRows.push(
    buildSimpleErrorCsvRow({ rowNumber, contactName, email, errorReason })
  );
}

function buildImportErrorCsvContent({
  import_,
}: {
  import_: ImportProgress;
}): string {
  const originalHeaders = import_.originalHeaders || [];
  const hasOriginalHeaders = originalHeaders.length > 0;
  const csvHeaders = hasOriginalHeaders
    ? [...originalHeaders, "Error Reason"]
    : ["Row", "Contact Name", "Email", "Error Reason"];
  const csvRows: string[] = [
    csvHeaders.map((h) => escapeCsvValue({ value: h })).join(","),
  ];

  import_.errors.forEach((error, errorIndex) => {
    appendImportErrorCsvRow({
      error,
      errorIndex,
      import_,
      csvRows,
      hasOriginalHeaders,
      originalHeaders,
    });
  });

  if (
    import_.errors.length === 0 &&
    import_.status === "failed" &&
    import_.message
  ) {
    if (hasOriginalHeaders) {
      const rowData = new Array(originalHeaders.length).fill("");
      rowData.push(escapeCsvValue({ value: import_.message }));
      csvRows.push(rowData.join(","));
    } else {
      csvRows.push(
        ["", "", "", escapeCsvValue({ value: import_.message })].join(",")
      );
    }
  }

  return csvRows.join("\n");
}

function triggerCsvDownload({
  content,
  fileName,
}: {
  content: string;
  fileName: string;
}): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function GlobalImportProgressPopup() {
  const { activeImports, clearImport } = useImportProgress();
  const [isMinimized, setIsMinimized] = useState(false);

  if (activeImports.length === 0) {
    return null;
  }

  const getStatusIcon = (status: ImportProgress["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "importing":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ImportProgress["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-800 hover:text-green-100 hover:bg-green-100">
            Completed
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "importing":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-800 hover:text-blue-100 hover:bg-blue-100">
            Importing...
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || toUTC();
    const duration = Math.floor((endTime.getTime() - start.getTime()) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600)
      return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const downloadReport = (import_: ImportProgress) => {
    triggerCsvDownload({
      content: buildImportErrorCsvContent({ import_ }),
      fileName: `failed-contacts-${import_.id}.csv`,
    });
  };

  // Minimized view
  if (isMinimized) {
    const activeCount = activeImports.filter(
      (imp) => imp.status === "importing"
    ).length;
    const completedCount = activeImports.filter(
      (imp) => imp.status === "completed"
    ).length;
    const hasActiveImports = activeCount > 0;

    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-lg border-2 border-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {hasActiveImports ? (
                  <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                Import Progress
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsMinimized(false)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    activeImports.forEach((imp) => clearImport(imp.id));
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {activeImports.slice(0, 3).map((import_) => (
                <div
                  key={import_.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate flex-1">{import_.source}</span>
                  <div className="flex items-center gap-2 ml-2">
                    {getStatusIcon(import_.status)}
                    <span className="text-muted-foreground">
                      {import_.status === "importing"
                        ? `${import_.importedContacts}/${import_.totalContacts}`
                        : import_.status === "completed"
                          ? `${import_.importedContacts} imported`
                          : "Failed"}
                    </span>
                  </div>
                </div>
              ))}
              {activeImports.length > 3 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{activeImports.length - 3} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expanded view
  const hasActiveImportsExpanded = activeImports.some(
    (imp) => imp.status === "importing"
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="shadow-2xl border-2 border-blue-500">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {hasActiveImportsExpanded ? (
                <Clock className="h-5 w-5 text-blue-500 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Import Progress
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsMinimized(true)}
                title="Minimize"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  activeImports.forEach((imp) => clearImport(imp.id));
                }}
                title="Close all"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[calc(80vh-80px)]">
            <div className="p-4 space-y-4">
              {activeImports.map((import_) => {
                const isActive = import_.status === "importing";

                return (
                  <div
                    key={import_.id}
                    className={cn(
                      "border rounded-lg p-4 space-y-3 transition-all",
                      isActive && "border-blue-500 bg-blue-50/50",
                      import_.status === "completed" &&
                        "border-green-500 bg-green-50/50",
                      import_.status === "failed" &&
                        "border-red-500 bg-red-50/50"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(import_.status)}
                        <span className="font-medium text-sm truncate">
                          {import_.source}
                        </span>
                      </div>
                      {getStatusBadge(import_.status)}
                    </div>

                    {/* Progress Bar */}
                    {isActive && (
                      <div className="space-y-2">
                        <Progress value={import_.progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {import_.importedContacts} of{" "}
                            {import_.totalContacts} contacts
                          </span>
                          <span>{Math.round(import_.progress)}%</span>
                        </div>
                      </div>
                    )}

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <span className="ml-1 font-medium">
                          {import_.totalContacts}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Imported:</span>
                        <span className="ml-1 font-medium text-green-600">
                          {import_.importedContacts}
                        </span>
                      </div>
                      {import_.updatedContacts > 0 && (
                        <div>
                          <span className="text-muted-foreground">
                            Updated:
                          </span>
                          <span className="ml-1 font-medium text-blue-600">
                            {import_.updatedContacts}
                          </span>
                        </div>
                      )}
                      {import_.duplicateContacts > 0 && (
                        <div>
                          <span className="text-muted-foreground">
                            Duplicates:
                          </span>
                          <span className="ml-1 font-medium text-amber-600">
                            {import_.duplicateContacts}
                          </span>
                        </div>
                      )}
                      {import_.failedContacts > 0 && (
                        <div>
                          <span className="text-muted-foreground">Failed:</span>
                          <span className="ml-1 font-medium text-red-600">
                            {import_.failedContacts}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="ml-1 font-medium">
                          {formatDuration(import_.startTime, import_.endTime)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {import_.status === "completed" && (
                      <div className="flex gap-2 pt-2">
                        {/* Only show download button if there are failed contacts */}
                        {import_.failedContacts > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => downloadReport(import_)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download Failed Records
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className={
                            import_.failedContacts > 0
                              ? "flex-1 text-xs"
                              : "w-full text-xs"
                          }
                          onClick={() => clearImport(import_.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Close
                        </Button>
                      </div>
                    )}

                    {import_.status === "failed" && (
                      <div className="flex gap-2 pt-2">
                        {/* Show download button for failed imports */}
                        {import_.errors.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => downloadReport(import_)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download Failed Records
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className={
                            import_.errors.length > 0
                              ? "flex-1 text-xs"
                              : "w-full text-xs"
                          }
                          onClick={() => clearImport(import_.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Close
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
