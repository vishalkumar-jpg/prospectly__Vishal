import { AnyType } from "@/types/common";
import { toUTC } from "@/lib/dayjs";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

export interface ImportError {
  row?: number;
  message: string;
  contact?: string;
  contactData?: Record<string, AnyType>; // Full contact data with all original fields
}

export interface ImportProgress {
  id: string;
  source: string;
  status: "importing" | "completed" | "failed" | "pending";
  progress: number; // 0-100
  totalContacts: number;
  importedContacts: number;
  updatedContacts: number;
  duplicateContacts: number;
  failedContacts: number;
  errors: ImportError[];
  startTime: Date;
  endTime?: Date;
  message?: string;
  originalHeaders?: string[]; // Original CSV headers for failed records CSV
  failedContactsData?: Record<string, AnyType>[]; // Full data for failed contacts
}

interface ImportProgressContextType {
  activeImports: ImportProgress[];
  startImport: (
    source: string,
    totalContacts: number,
    originalHeaders?: string[]
  ) => string;
  updateImport: (id: string, updates: Partial<ImportProgress>) => void;
  completeImport: (
    id: string,
    result: {
      imported: number;
      updated: number;
      duplicates: number;
      errors: number;
      errorMessages?: string[];
      failedContactsData?: Record<string, AnyType>[];
      originalHeaders?: string[];
    }
  ) => void;
  failImport: (id: string, error: string) => void;
  clearImport: (id: string) => void;
  clearAllImports: () => void;
}

interface CompleteImportResult {
  imported: number;
  updated: number;
  duplicates: number;
  errors: number;
  errorMessages?: string[];
  failedContactsData?: Record<string, AnyType>[];
  originalHeaders?: string[];
}

const ImportProgressContext = createContext<
  ImportProgressContextType | undefined
>(undefined);

function buildImportErrors({
  errorMessages,
  existingErrors,
  failedContactsData,
}: {
  errorMessages?: string[];
  existingErrors: ImportError[];
  failedContactsData?: Record<string, AnyType>[];
}): ImportError[] {
  if (!errorMessages || errorMessages.length === 0) {
    return [];
  }

  return errorMessages.map((message, index) => {
    const existingError = existingErrors[index];

    return {
      message,
      contactData: existingError?.contactData || failedContactsData?.[index],
      row: existingError?.row,
    };
  });
}

function buildCompletedImportState({
  importItem,
  result,
}: {
  importItem: ImportProgress;
  result: CompleteImportResult;
}): ImportProgress {
  const errors = buildImportErrors({
    errorMessages: result.errorMessages,
    existingErrors: importItem.errors,
    failedContactsData: result.failedContactsData,
  });

  return {
    ...importItem,
    status: "completed",
    progress: 100,
    importedContacts: result.imported,
    updatedContacts: result.updated,
    duplicateContacts: result.duplicates,
    failedContacts: result.errors,
    errors: errors.length > 0 ? errors : importItem.errors,
    failedContactsData:
      result.failedContactsData || importItem.failedContactsData,
    originalHeaders: result.originalHeaders || importItem.originalHeaders,
    endTime: toUTC(),
  };
}

export function ImportProgressProvider({ children }: { children: ReactNode }) {
  const [activeImports, setActiveImports] = useState<ImportProgress[]>([]);

  const startImport = useCallback(
    (
      source: string,
      totalContacts: number,
      originalHeaders?: string[]
    ): string => {
      const id = `import-${toUTC().valueOf()}-${Math.random().toString(36).substr(2, 9)}`;
      const newImport: ImportProgress = {
        id,
        source,
        status: "importing",
        progress: 0,
        totalContacts,
        importedContacts: 0,
        updatedContacts: 0,
        duplicateContacts: 0,
        failedContacts: 0,
        errors: [],
        startTime: toUTC(),
        originalHeaders,
      };

      setActiveImports((prev) => {
        const updated = [newImport, ...prev];
        return updated.slice(0, 3);
      });
      return id;
    },
    []
  );

  const updateImport = useCallback(
    (id: string, updates: Partial<ImportProgress>) => {
      setActiveImports((prev) =>
        prev.map((import_) =>
          import_.id === id ? { ...import_, ...updates } : import_
        )
      );
    },
    []
  );

  const completeImport = useCallback(
    (id: string, result: CompleteImportResult) => {
      setActiveImports((prev) =>
        prev.map((import_) =>
          import_.id === id
            ? buildCompletedImportState({ importItem: import_, result })
            : import_
        )
      );
    },
    []
  );

  const failImport = useCallback((id: string, error: string) => {
    setActiveImports((prev) =>
      prev.map((import_) =>
        import_.id === id
          ? {
              ...import_,
              status: "failed",
              errors: [{ message: error }],
              endTime: toUTC(),
            }
          : import_
      )
    );
  }, []);

  const clearImport = useCallback((id: string) => {
    setActiveImports((prev) => prev.filter((import_) => import_.id !== id));
  }, []);

  const clearAllImports = useCallback(() => {
    setActiveImports([]);
  }, []);

  return (
    <ImportProgressContext.Provider
      value={{
        activeImports,
        startImport,
        updateImport,
        completeImport,
        failImport,
        clearImport,
        clearAllImports,
      }}
    >
      {children}
    </ImportProgressContext.Provider>
  );
}

export function useImportProgress() {
  const context = useContext(ImportProgressContext);
  if (context === undefined) {
    throw new Error(
      "useImportProgress must be used within an ImportProgressProvider"
    );
  }
  return context;
}
