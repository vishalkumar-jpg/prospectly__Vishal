import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import {
  normalizeContactImportHeaders,
  parseCSV,
  suggestFieldMappings,
  transformRowData,
} from "@/utils/csvImport";
import { apiRequest } from "@/lib/api";
import { toUTC } from "@/lib/dayjs";
import { analytics } from "@/lib/analytics";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  source: string;
  avatar?: string;
  linkedInProfile?: string;
  isBusinessContact?: boolean;
  isProfessional?: boolean;
  contactQuality: "high" | "medium" | "low";
  isDuplicate?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

interface ImportSession {
  id: string;
  source: string;
  status: "importing" | "completed" | "failed" | "pending";
  progress: number;
  totalContacts: number;
  importedContacts: number;
  duplicatesFound: number;
  errors: number;
  startTime: Date;
  endTime?: Date;
  lastMatched?: string; // Added lastMatched field
}

// Mock data generators
const generateMockContacts = (source: string, count: number): Contact[] => {
  const firstNames = [
    "John",
    "Jane",
    "Michael",
    "Sarah",
    "David",
    "Lisa",
    "Robert",
    "Emily",
    "James",
    "Maria",
    "Alex",
    "Rachel",
    "Kevin",
    "Amanda",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Thompson",
    "Wilson",
    "Taylor",
    "Anderson",
  ];
  const companies = [
    "TechCorp",
    "Innovation Labs",
    "Global Solutions",
    "Digital Dynamics",
    "Future Systems",
    "Smart Industries",
    "Growth Partners",
    "Venture Capital Inc",
    "Enterprise Solutions",
    "CloudTech Systems",
  ];
  const titles = [
    "VP Sales",
    "Director of Marketing",
    "Senior Engineer",
    "Product Manager",
    "Business Development",
    "CEO",
    "CTO",
    "Head of Operations",
    "Strategic Partnerships",
    "Sales Manager",
  ];
  const domains = [
    "gmail.com",
    "company.com",
    "business.org",
    "startup.io",
    "enterprise.net",
    "corporate.com",
  ];

  // Quality varies by source
  const getContactQuality = (sourceType: string): "high" | "medium" | "low" => {
    if (
      sourceType.includes("CRM") ||
      sourceType.includes("Salesforce") ||
      sourceType.includes("HubSpot")
    ) {
      return Math.random() > 0.3 ? "high" : "medium"; // 70% high quality from CRM
    }
    if (sourceType.includes("Google") || sourceType.includes("Microsoft")) {
      return Math.random() > 0.5 ? "medium" : "high"; // 50% medium, 50% high from email
    }
    return Math.random() > 0.6 ? "medium" : "low"; // Lower quality from other sources
  };

  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];

    const isDuplicate = Math.random() < 0.12; // 12% chance of duplicate
    const isError = Math.random() < 0.03; // 3% chance of error
    const contactQuality = getContactQuality(source);
    const isProfessional =
      contactQuality === "high" ||
      (contactQuality === "medium" && Math.random() > 0.4);
    const isBusinessContact = isProfessional && Math.random() > 0.2;

    return {
      id: `${source}-${i}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
      phone:
        Math.random() > 0.3
          ? `+1 (555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
          : undefined,
      company: isBusinessContact
        ? company
        : Math.random() > 0.5
          ? company
          : undefined,
      title: isProfessional
        ? titles[Math.floor(Math.random() * titles.length)]
        : undefined,
      source,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}`,
      linkedInProfile:
        isProfessional && Math.random() > 0.4
          ? `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`
          : undefined,
      isBusinessContact,
      isProfessional,
      contactQuality,
      isDuplicate,
      isError,
      errorMessage: isError ? "Invalid email format" : undefined,
    };
  });
};

const getContactCountForSource = (source: string): number => {
  const counts = {
    "Google Contacts": Math.floor(Math.random() * 600) + 250, // Higher counts for primary platforms
    "Microsoft Outlook": Math.floor(Math.random() * 450) + 200,
    "Apple iCloud": Math.floor(Math.random() * 300) + 150,
    "Yahoo Mail": Math.floor(Math.random() * 250) + 100,
    LinkedIn: Math.floor(Math.random() * 800) + 300,
    "Salesforce CRM": Math.floor(Math.random() * 1200) + 500, // CRM typically has more contacts
    "HubSpot CRM": Math.floor(Math.random() * 800) + 300,
    "CSV File": Math.floor(Math.random() * 200) + 75,
    "Excel File": Math.floor(Math.random() * 250) + 100,
    "vCard File": Math.floor(Math.random() * 50) + 25,
  };
  return counts[source as keyof typeof counts] || 150;
};

/** Same shape as historical `startImport` ids — timestamp + random segment */
export function createImportSessionId(): string {
  return `import-${toUTC().valueOf()}-${Math.random().toString(36).substring(2, 11)}`;
}

interface CompleteImportSessionParams {
  sessions: ImportSession[];
  sessionId: string;
  totalContacts: number;
  errors: number;
}

const completeImportSession = ({
  sessions,
  sessionId,
  totalContacts,
  errors,
}: CompleteImportSessionParams): ImportSession[] => {
  return sessions.map((session) => {
    if (session.id !== sessionId) return session;

    const completedAt = toUTC();

    return {
      ...session,
      status: "completed" as const,
      progress: 100,
      importedContacts: totalContacts - errors,
      endTime: completedAt,
      lastMatched: completedAt.toISOString().split("T")[0],
    };
  });
};

export function useImportContacts() {
  const [importSessions, setImportSessions] = useState<ImportSession[]>([]);
  const [sessionContacts, setSessionContacts] = useState<
    Record<string, Contact[]>
  >({});
  const [isImporting, setIsImporting] = useState(false);

  const startImport = useCallback((source: string) => {
    const sessionId = createImportSessionId();
    const totalContacts = getContactCountForSource(source);
    const contacts = generateMockContacts(source, totalContacts);

    const duplicatesFound = contacts.filter((c) => c.isDuplicate).length;
    const errors = contacts.filter((c) => c.isError).length;

    const newSession: ImportSession = {
      id: sessionId,
      source,
      status: "importing",
      progress: 0,
      totalContacts,
      importedContacts: 0,
      duplicatesFound,
      errors,
      startTime: toUTC(),
    };

    setImportSessions((prev) => [newSession, ...prev]);
    setSessionContacts((prev) => ({ ...prev, [sessionId]: contacts }));
    setIsImporting(true);

    // Simulate completion after a delay
    setTimeout(
      () => {
        setImportSessions((prev) =>
          completeImportSession({
            sessions: prev,
            sessionId,
            totalContacts,
            errors,
          })
        );
        setIsImporting(false);
      },
      Math.random() * 5000 + 3000
    ); // 3-8 seconds

    return sessionId;
  }, []);

  const startFileImport = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return null;

    // Track upload initiation immediately
    analytics.trackContactsUploaded({
      source: "csv",
      countImported: 0,
      countFailed: 0,
      durationMs: 0,
    });

    setIsImporting(true);
    const importStartTime = Date.now();

    try {
      // Only support CSV for now
      if (!file.name.endsWith(".csv")) {
        throw new Error("Only CSV files are supported for encrypted import");
      }

      // Read file content
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      // Parse CSV
      const { headers: rawHeaders, rows } = parseCSV(content);
      const headers = normalizeContactImportHeaders(rawHeaders);

      if (rows.length === 0) {
        throw new Error("CSV file is empty");
      }

      // Generate suggested mappings
      const suggestedMappings = suggestFieldMappings(headers);

      // Transform rows to contact objects
      const contacts = rows.map((row) =>
        transformRowData(row, headers, suggestedMappings)
      );

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

      // Filter out invalid contacts (missing required fields) and filter to allowed fields only
      // Require first_name AND (email OR phone_number OR linkedin)
      const validContacts = contacts
        .filter(
          (c) => c.first_name && (c.email || c.phone_number || c.linkedin)
        )
        .map((contact) => {
          const filtered: Record<string, string> = {};
          allowedFields.forEach((field) => {
            if (contact[field] !== undefined) {
              filtered[field] = contact[field];
            }
          });
          return filtered;
        });

      if (validContacts.length === 0) {
        throw new Error(
          "No valid contacts found. First name and either email, phone number, or LinkedIn URL are required."
        );
      }

      // Use centralized API request which handles automatic token refresh and CSRF tokens
      const data = await apiRequest<{
        success: boolean;
        imported: number;
        updated: number;
        duplicates: number;
        errors: number;
        totalProcessed: number;
      }>("/contacts/import-csv", {
        method: "POST",
        body: JSON.stringify({
          contacts: validContacts,
          source: "csv_import",
        }),
      });

      // Create session record
      const sessionId = `import-${toUTC().valueOf()}`;
      const newSession: ImportSession = {
        id: sessionId,
        source: "CSV Import",
        status: "completed",
        progress: 100,
        totalContacts: data.totalProcessed,
        importedContacts: data.imported,
        duplicatesFound: data.duplicates,
        errors: data.errors,
        startTime: toUTC(),
        endTime: toUTC(),
      };

      setImportSessions((prev) => [newSession, ...prev]);
      setIsImporting(false);

      analytics.trackContactsUploaded({
        source: "csv",
        countImported: data.imported,
        countFailed: data.errors,
        durationMs: Date.now() - importStartTime,
      });

      return sessionId;
    } catch (error: unknown) {
      setIsImporting(false);
      toast({
        title: "Import Error",
        description:
          error instanceof Error ? error.message : "Failed to import contacts",
        variant: "destructive",
      });
      return null;
    }
  }, []);

  const getSessionContacts = useCallback(
    (sessionId: string): Contact[] => {
      return sessionContacts[sessionId] || [];
    },
    [sessionContacts]
  );

  const downloadReport = useCallback(
    (sessionId: string) => {
      const session = importSessions.find((s) => s.id === sessionId);
      if (!session) return;

      const reportData = {
        sessionId,
        source: session.source,
        timestamp: session.startTime.toISOString(),
        summary: {
          totalContacts: session.totalContacts,
          imported: session.importedContacts,
          duplicates: session.duplicatesFound,
          errors: session.errors,
        },
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `import-report-${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Downloaded",
        description: "Import report has been downloaded successfully",
      });
    },
    [importSessions]
  );

  return {
    importSessions,
    sessionContacts,
    isImporting,
    startImport,
    startFileImport,
    getSessionContacts,
    downloadReport,
  };
}
