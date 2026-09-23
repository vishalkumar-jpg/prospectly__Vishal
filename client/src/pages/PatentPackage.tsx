import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  FileText,
  Package,
  FileDown,
  FolderArchive,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from "docx";
import JSZip from "jszip";
import { formatLocalizedShortDateTime } from "@/utils/dateFormatter";
import { toUTC, utcDayjs } from "@/lib/dayjs";

const patentDocuments = [
  { id: "01", title: "Abstract", file: "01-abstract.md" },
  { id: "02", title: "Background", file: "02-background.md" },
  {
    id: "03",
    title: "Detailed Description",
    file: "03-detailed-description.md",
  },
  { id: "04", title: "System Diagrams", file: "04-system-diagrams.md" },
  { id: "05", title: "Claims", file: "05-claims.md" },
  {
    id: "06",
    title: "Warm Introduction System",
    file: "06-warm-introduction-system.md",
  },
  {
    id: "07",
    title: "Referral Payout Escrow System",
    file: "07-bounty-escrow-system.md",
  },
  {
    id: "08",
    title: "Calendar Integration",
    file: "08-calendar-integration.md",
  },
  {
    id: "09",
    title: "Trust Score Algorithm",
    file: "09-trust-score-algorithm.md",
  },
  { id: "10", title: "Dispute Detection", file: "10-dispute-detection.md" },
  { id: "README", title: "Documentation Index", file: "README.md" },
];

export default function PatentPackage() {
  const downloadAllDocuments = async () => {
    try {
      const allContent = await Promise.all(
        patentDocuments.map(async (doc) => {
          const response = await fetch(`/docs/patent/${doc.file}`);
          const content = await response.text();
          return { title: doc.title, content };
        })
      );
      return allContent;
    } catch {
      return null;
    }
  };

  const downloadMarkdown = async () => {
    try {
      const allContent = await downloadAllDocuments();
      if (!allContent) {
        toast.error("Failed to fetch documents");
        return;
      }

      const fullPackage = `# PROSPECTLY PATENT APPLICATION PACKAGE
## Complete Technical Documentation
### Generated: ${formatLocalizedShortDateTime(toUTC())}

${allContent.map((doc) => `\n\n${"=".repeat(80)}\n# ${doc.title}\n${"=".repeat(80)}\n\n${doc.content}`).join("\n")}

---
End of Patent Package
`;

      const blob = new Blob([fullPackage], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prospectly-patent-package-${utcDayjs().format("YYYY-MM-DD")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Patent package downloaded successfully");
    } catch {
      toast.error("Failed to download patent package");
    }
  };

  const downloadPDF = async () => {
    try {
      toast.loading("Generating PDF...");
      const allContent = await downloadAllDocuments();
      if (!allContent) {
        toast.error("Failed to fetch documents");
        return;
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Title page
      pdf.setFontSize(24);
      pdf.text("PROSPECTLY", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;

      pdf.setFontSize(18);
      pdf.text("PATENT APPLICATION PACKAGE", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text("Complete Technical Documentation", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 8;
      pdf.text(
        `Generated: ${formatLocalizedShortDateTime(toUTC())}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );

      pdf.addPage();
      yPosition = margin;

      // Process each document
      for (const doc of allContent) {
        pdf.setFontSize(16);
        const titleLines = pdf.splitTextToSize(doc.title, maxWidth);

        if (yPosition + titleLines.length * 10 > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFont(undefined, "bold");
        titleLines.forEach((line: string) => {
          pdf.text(line, margin, yPosition);
          yPosition += 10;
        });

        yPosition += 5;
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(10);

        const contentLines = pdf.splitTextToSize(doc.content, maxWidth);
        contentLines.forEach((line: string) => {
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += 6;
        });

        yPosition += 10;
      }

      pdf.save(
        `prospectly-patent-package-${utcDayjs().format("YYYY-MM-DD")}.pdf`
      );
      toast.dismiss();
      toast.success("PDF downloaded successfully");
    } catch {
      toast.dismiss();
      toast.error("Failed to generate PDF");
    }
  };

  const downloadWord = async () => {
    try {
      toast.loading("Generating Word document...");
      const allContent = await downloadAllDocuments();
      if (!allContent) {
        toast.error("Failed to fetch documents");
        return;
      }

      const children: Paragraph[] = [];

      // Title page
      children.push(
        new Paragraph({
          text: "PROSPECTLY",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: "PATENT APPLICATION PACKAGE",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: "Complete Technical Documentation",
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `Generated: ${formatLocalizedShortDateTime(toUTC())}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );

      // Add each document
      allContent.forEach((doc) => {
        children.push(
          new Paragraph({
            text: doc.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          })
        );

        const contentParagraphs = doc.content
          .split("\n")
          .filter((line) => line.trim());
        contentParagraphs.forEach((para) => {
          const isHeading = para.startsWith("#");
          children.push(
            new Paragraph({
              text: para.replace(/^#+\s*/, ""),
              heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
              spacing: { after: 100 },
            })
          );
        });
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prospectly-patent-package-${utcDayjs().format("YYYY-MM-DD")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success("Word document downloaded successfully");
    } catch {
      toast.dismiss();
      toast.error("Failed to generate Word document");
    }
  };
  const downloadIndividualDocument = async (
    doc: (typeof patentDocuments)[0]
  ) => {
    try {
      const response = await fetch(`/docs/patent/${doc.file}`);
      const content = await response.text();

      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${doc.title} downloaded`);
    } catch {
      toast.error(`Failed to download ${doc.title}`);
    }
  };

  const generatePDFBlob = async (
    allContent: { title: string; content: string }[]
  ): Promise<Blob> => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = margin;

    // Title page
    pdf.setFontSize(24);
    pdf.text("PROSPECTLY", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;

    pdf.setFontSize(18);
    pdf.text("PATENT APPLICATION PACKAGE", pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.text("Complete Technical Documentation", pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 8;
    pdf.text(
      `Generated: ${formatLocalizedShortDateTime(toUTC())}`,
      pageWidth / 2,
      yPosition,
      { align: "center" }
    );

    pdf.addPage();
    yPosition = margin;

    // Process each document
    for (const doc of allContent) {
      pdf.setFontSize(16);
      const titleLines = pdf.splitTextToSize(doc.title, maxWidth);

      if (yPosition + titleLines.length * 10 > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFont(undefined, "bold");
      titleLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += 10;
      });

      yPosition += 5;
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(10);

      const contentLines = pdf.splitTextToSize(doc.content, maxWidth);
      contentLines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += 6;
      });

      yPosition += 10;
    }

    return pdf.output("blob");
  };

  const downloadZipPackage = async () => {
    try {
      toast.loading("Generating ZIP package...");
      const allContent = await downloadAllDocuments();
      if (!allContent) {
        toast.error("Failed to fetch documents");
        return;
      }

      const zip = new JSZip();

      // Create folders
      const individualDocsFolder = zip.folder("individual-documents");
      const consolidatedFolder = zip.folder("consolidated");

      // Add individual markdown files
      allContent.forEach((doc, index) => {
        const fileName = `${String(index + 1).padStart(2, "0")}-${doc.title.toLowerCase().replace(/\s+/g, "-")}.md`;
        individualDocsFolder?.file(fileName, doc.content);
      });

      // Add consolidated markdown
      const fullMarkdown = `# PROSPECTLY PATENT APPLICATION PACKAGE
## Complete Technical Documentation
### Generated: ${formatLocalizedShortDateTime(toUTC())}

${allContent.map((doc) => `\n\n${"=".repeat(80)}\n# ${doc.title}\n${"=".repeat(80)}\n\n${doc.content}`).join("\n")}

---
End of Patent Package
`;
      consolidatedFolder?.file("prospectly-patent-package.md", fullMarkdown);

      // Add consolidated PDF
      const pdfBlob = await generatePDFBlob(allContent);
      consolidatedFolder?.file("prospectly-patent-package.pdf", pdfBlob);

      // Add README
      const readme = `# Prospectly Patent Application Package

This package contains the complete technical documentation for patent filing.

## Contents

### Individual Documents Folder
Contains all ${allContent.length} patent documents as separate markdown files:
${allContent.map((doc, i) => `${i + 1}. ${doc.title}`).join("\n")}

### Consolidated Folder
- **prospectly-patent-package.md** - All documents in a single markdown file
- **prospectly-patent-package.pdf** - All documents in a single PDF file

## Package Details
- Generated: ${formatLocalizedShortDateTime(toUTC())}
- Total Documents: ${allContent.length}
- Format: Markdown (.md) and PDF (.pdf)

## Patent Coverage
- Multi-Stage Referral Payout Escrow System
- Calendar-Triggered Payment Release
- Trust Score Algorithm
- Proactive Dispute Detection
- Warm Introduction Workflow
- Complete System Architecture

## Usage
Review the individual documents for specific sections or use the consolidated files for the complete package.

---
Prospectly Inc. - Confidential Patent Documentation
`;
      zip.file("README.txt", readme);

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prospectly-patent-package-${utcDayjs().format("YYYY-MM-DD")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success("ZIP package downloaded successfully");
    } catch {
      toast.dismiss();
      toast.error("Failed to generate ZIP package");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Prospectly Patent Package</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Complete technical documentation for patent filing covering
            multi-stage referral payout escrow, calendar-triggered payments,
            trust scoring, and dispute detection systems.
          </p>
        </div>

        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Download Complete Package
            </CardTitle>
            <CardDescription>
              Get all {patentDocuments.length} patent documents in your
              preferred format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Button onClick={downloadMarkdown} size="lg" variant="outline">
                <FileText className="w-5 h-5 mr-2" />
                Markdown
              </Button>
              <Button onClick={downloadPDF} size="lg" variant="outline">
                <FileDown className="w-5 h-5 mr-2" />
                PDF
              </Button>
              <Button onClick={downloadWord} size="lg" variant="outline">
                <FileText className="w-5 h-5 mr-2" />
                Word
              </Button>
              <Button
                onClick={downloadZipPackage}
                size="lg"
                className="bg-primary"
              >
                <FolderArchive className="w-5 h-5 mr-2" />
                ZIP Package
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              <strong>ZIP Package includes:</strong> All individual files +
              consolidated PDF and Markdown
            </p>
          </CardContent>
        </Card>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Individual Documents</h2>
          <p className="text-muted-foreground mb-6">
            Download specific sections of the patent documentation
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {patentDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  {doc.id === "README" ? doc.id : `Section ${doc.id}`}
                </CardTitle>
                <CardDescription>{doc.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => downloadIndividualDocument(doc)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-12 bg-muted/50">
          <CardHeader>
            <CardTitle>Package Contents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Core Patent Documents</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Abstract - System overview and patent classification</li>
                <li>Background - Prior art analysis and problems solved</li>
                <li>
                  Detailed Description - Complete technical specifications
                </li>
                <li>System Diagrams - 9 Mermaid architecture diagrams</li>
                <li>Claims - 14 independent and dependent patent claims</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Technical Specifications</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>
                  Warm Introduction Workflow - Complete state machine and user
                  flows
                </li>
                <li>
                  Referral Payout Escrow Implementation - Multi-stage payment
                  processing
                </li>
                <li>
                  Calendar Integration - OAuth flows and webhook automation
                </li>
                <li>
                  Trust Score Algorithm - 4-component reputation calculation
                </li>
                <li>Dispute Detection - Proactive anomaly identification</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Supporting Materials</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>README - Complete documentation index and filing guide</li>
                <li>Database schemas and edge function pseudocode</li>
                <li>Security architecture and prior art comparison</li>
                <li>
                  USPTO classification codes (G06Q 10/10, G06Q 20/38, G06Q
                  30/02)
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
