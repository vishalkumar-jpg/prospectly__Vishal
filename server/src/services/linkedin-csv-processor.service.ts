import { Injectable, Logger } from "@nestjs/common";
import * as yauzl from "yauzl";
import { AnyType } from "types/common";
import { ContactImportRow } from "./contactImportService";

@Injectable()
export class LinkedInCsvProcessorService {
  private readonly logger = new Logger(LinkedInCsvProcessorService.name);

  /**
   * Extract zip file and return map of filename -> file content
   * @param zipBuffer - Buffer containing the zip file data
   * @returns Map of filename -> file content buffer
   */
  async extractZipFile(zipBuffer: Buffer): Promise<Map<string, Buffer>> {
    return new Promise((resolve, reject) => {
      const fileMap = new Map<string, Buffer>();

      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          this.logger.error(`Failed to open zip file: ${err.message}`);
          reject(err);
          return;
        }

        if (!zipfile) {
          reject(new Error("Failed to create zipfile object"));
          return;
        }

        zipfile.readEntry();
        let entryCount = 0;
        let processedCount = 0;

        zipfile.on("entry", (entry) => {
          entryCount++;

          // Only process CSV files
          if (entry.fileName.toLowerCase().endsWith(".csv")) {
            zipfile.openReadStream(entry, (openErr, readStream) => {
              if (openErr) {
                this.logger.error(
                  `Failed to open read stream for ${entry.fileName}: ${openErr.message}`
                );
                processedCount++;
                if (processedCount === entryCount) {
                  resolve(fileMap);
                }
                return;
              }

              if (!readStream) {
                this.logger.error(`Read stream is null for ${entry.fileName}`);
                processedCount++;
                if (processedCount === entryCount) {
                  resolve(fileMap);
                }
                return;
              }

              const chunks: Buffer[] = [];
              readStream.on("data", (chunk: Buffer) => {
                chunks.push(chunk);
              });

              readStream.on("end", () => {
                const fileBuffer = Buffer.concat(chunks);
                fileMap.set(entry.fileName, fileBuffer);
                this.logger.log(
                  `Extracted ${entry.fileName} (${fileBuffer.length} bytes)`
                );
                processedCount++;
                if (processedCount === entryCount) {
                  resolve(fileMap);
                }
              });

              readStream.on("error", (readErr) => {
                this.logger.error(
                  `Error reading ${entry.fileName}: ${readErr.message}`
                );
                processedCount++;
                if (processedCount === entryCount) {
                  resolve(fileMap);
                }
              });
            });
          } else {
            // Skip non-CSV files
            processedCount++;
            if (processedCount === entryCount) {
              resolve(fileMap);
            }
          }

          zipfile.readEntry();
        });

        zipfile.on("end", () => {
          if (entryCount === 0) {
            resolve(fileMap);
          }
        });

        zipfile.on("error", (zipErr) => {
          this.logger.error(`Zip file error: ${zipErr.message}`);
          reject(zipErr);
        });
      });
    });
  }

  /**
   * Find the header row index in Connections.csv by detecting expected column names
   * Skips metadata rows like "Notes:" and informational messages
   * @param lines - All CSV lines including empty ones
   * @returns Index of the header row, or 0 as fallback
   */
  private findConnectionsHeaderRowIndex(lines: string[]): number {
    // Expected Connections.csv column names (case-insensitive)
    const expectedColumns = [
      "first name",
      "last name",
      "url",
      "email address",
      "company",
      "position",
      "title",
      "profile url",
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        continue;
      }

      // Skip rows that are clearly metadata
      // Check if line starts with "Notes:" (case-insensitive)
      if (line.toLowerCase().startsWith("notes:")) {
        continue;
      }

      // Parse the line to get columns
      const columns = this.parseCSVLine(line);

      // Skip rows with only 1 column (not proper CSV structure)
      if (columns.length <= 1) {
        continue;
      }

      // Check if this row contains expected Connections.csv column names
      // Count how many expected columns are found (case-insensitive)
      let matchCount = 0;
      for (const column of columns) {
        const normalizedColumn = column.trim().toLowerCase();
        if (expectedColumns.includes(normalizedColumn)) {
          matchCount++;
        }
      }

      // If we found 2+ expected columns, this is likely the header row
      if (matchCount >= 2) {
        this.logger.log(
          `Found Connections.csv header at row ${i + 1} (index ${i}) with ${matchCount} matching columns`
        );
        return i;
      }
    }

    // Fallback to first non-empty line if no header found
    this.logger.warn(
      "Could not detect Connections.csv header row, falling back to first non-empty line"
    );
    return 0;
  }

  /**
   * Parse CSV file and return array of row objects
   * @param csvBuffer - Buffer containing CSV file data
   * @param enableHeaderDetection - If true, detect header row for Connections.csv (default: false)
   * @returns Array of row objects with column names as keys
   */
  async parseCSVFile(
    csvBuffer: Buffer,
    enableHeaderDetection = false
  ): Promise<Array<Record<string, string>>> {
    try {
      const csvContent = csvBuffer.toString("utf-8");
      const allLines = csvContent.split("\n");

      if (enableHeaderDetection) {
        // For Connections.csv: find the actual header row, skipping metadata
        const headerRowIndex = this.findConnectionsHeaderRowIndex(allLines);
        const headers = this.parseCSVLine(allLines[headerRowIndex].trim());

        // Parse data rows starting after the header
        const records: Array<Record<string, string>> = [];
        for (let i = headerRowIndex + 1; i < allLines.length; i++) {
          const line = allLines[i].trim();
          if (!line) continue; // Skip empty lines

          const values = this.parseCSVLine(line);
          if (values.length === 0) continue;

          const record: Record<string, string> = {};
          headers.forEach((header, index) => {
            record[header] = values[index] || "";
          });
          records.push(record);
        }

        return records;
      } else {
        // Existing behavior for other CSV files: use first non-empty line as header
        const lines = allLines.filter((line) => line.trim());

        if (lines.length === 0) {
          return [];
        }

        // Parse header
        const headers = this.parseCSVLine(lines[0]);

        // Parse rows
        const records: Array<Record<string, string>> = [];
        for (let i = 1; i < lines.length; i++) {
          const values = this.parseCSVLine(lines[i]);
          if (values.length === 0) continue;

          const record: Record<string, string> = {};
          headers.forEach((header, index) => {
            record[header] = values[index] || "";
          });
          records.push(record);
        }

        return records;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to parse CSV: ${errorMessage}`);
      throw new Error(`CSV parsing failed: ${errorMessage}`);
    }
  }

  /**
   * Parse a single CSV line, handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());
    return result;
  }

  /**
   * Transform Invitations.csv row to contact format
   * Extracts contacts from both "To" and "From" fields
   * @param row - CSV row from Invitations.csv
   * @returns Array of contacts and inviterProfileUrl for user profile identification
   */
  transformInvitationsRow(row: Record<string, string>): {
    contacts: ContactImportRow[];
    inviterProfileUrl: string | null;
  } {
    // Extract inviterProfileUrl for user profile
    const inviterProfileUrl = row.inviterProfileUrl || null;
    const contacts: ContactImportRow[] = [];

    // Extract contact information from "To" field
    const toName = row.To || "";
    if (toName.trim()) {
      const toNameParts = toName.trim().split(/\s+/);
      const toFirstName = toNameParts[0] || "";
      const toLastName = toNameParts.slice(1).join(" ") || "";

      if (toFirstName || toLastName) {
        contacts.push({
          first_name: toFirstName || undefined,
          last_name: toLastName || undefined,
          linkedin: row.inviteeProfileUrl || undefined,
        });
      }
    }

    // Extract contact information from "From" field
    const fromName = row.From || "";
    if (fromName.trim()) {
      const fromNameParts = fromName.trim().split(/\s+/);
      const fromFirstName = fromNameParts[0] || "";
      const fromLastName = fromNameParts.slice(1).join(" ") || "";

      if (fromFirstName || fromLastName) {
        contacts.push({
          first_name: fromFirstName || undefined,
          last_name: fromLastName || undefined,
          linkedin: row.inviterProfileUrl || undefined,
        });
      }
    }

    return { contacts, inviterProfileUrl };
  }

  /**
   * Transform Connections.csv row to contact format
   * @param row - CSV row from Connections.csv
   * @returns ContactImportRow or null if invalid
   */
  transformConnectionsRow(
    row: Record<string, string>
  ): ContactImportRow | null {
    const firstName = row["First Name"] || row["FirstName"] || "";
    const lastName = row["Last Name"] || row["LastName"] || "";
    const email = row["Email Address"] || row["EmailAddress"] || "";
    const company = row["Company"] || "";
    const title = row["Position"] || row["Title"] || "";
    const linkedin =
      row["Profile URL"] || row["ProfileURL"] || row["URL"] || "";

    // Require at least first name and either email or LinkedIn URL
    if (!firstName && !lastName) {
      return null;
    }

    // Require at least one primary identifier: email OR LinkedIn URL
    if (!email && !linkedin) {
      return null;
    }

    return {
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      email: email || undefined,
      company: company || undefined,
      title: title || undefined,
      linkedin: linkedin || undefined,
    };
  }

  /**
   * Transform ImportedContacts.csv row to contact format
   * @param row - CSV row from ImportedContacts.csv
   * @returns ContactImportRow or null if invalid
   */
  transformImportedContactsRow(
    row: Record<string, string>
  ): ContactImportRow | null {
    const firstName = row["First Name"] || row["FirstName"] || "";
    const lastName = row["Last Name"] || row["LastName"] || "";
    const email = row["Email Address"] || row["EmailAddress"] || "";
    const company = row["Company"] || "";
    const title = row["Position"] || row["Title"] || "";
    const phone =
      row["Phone"] || row["Phone Number"] || row["PhoneNumber"] || "";
    const linkedin = row["Profile URL"] || row["ProfileURL"] || "";

    // Require at least first name and either email, phone, or LinkedIn
    if (!firstName && !lastName) {
      return null;
    }

    if (!email && !phone && !linkedin) {
      return null;
    }

    return {
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      email: email || undefined,
      phone_number: phone || undefined,
      company: company || undefined,
      title: title || undefined,
      linkedin: linkedin || undefined,
    };
  }

  /**
   * Extract and structure Profile.csv data
   * @param profileRows - Array of rows from Profile.csv (should be single row)
   * @returns Structured profile data object
   */
  extractProfileData(
    profileRows: Array<Record<string, string>>
  ): Record<string, AnyType> {
    if (profileRows.length === 0) {
      return {};
    }

    const [row] = profileRows;
    return {
      firstName: row["First Name"] || row["FirstName"] || "",
      lastName: row["Last Name"] || row["LastName"] || "",
      headline: row["Headline"] || "",
      summary: row["Summary"] || "",
      industry: row["Industry"] || "",
      location: row["Geo Location"] || row["GeoLocation"] || "",
      website: row["Websites"] || "",
      twitter: row["Twitter Handles"] || row["TwitterHandles"] || "",
    };
  }
}
