/** Content-IDs referenced as `cid:…` in contact-import-reminder.html (Gmail-safe). */
export const CONTACT_IMPORT_ICON_CIDS = {
  google: "contact-import-icon-google",
  microsoft: "contact-import-icon-microsoft",
  apple: "contact-import-icon-apple",
  appleDark: "contact-import-icon-apple-dark",
  csv: "contact-import-icon-csv",
} as const;

const ICON_FILES: {
  variableKey: string;
  cid: string;
  filename: string;
}[] = [
  {
    variableKey: "sourceIconGoogleSrc",
    cid: CONTACT_IMPORT_ICON_CIDS.google,
    filename: "google.png",
  },
  {
    variableKey: "sourceIconMicrosoftSrc",
    cid: CONTACT_IMPORT_ICON_CIDS.microsoft,
    filename: "microsoft.png",
  },
  {
    variableKey: "sourceIconAppleSrc",
    cid: CONTACT_IMPORT_ICON_CIDS.apple,
    filename: "apple.png",
  },
  {
    variableKey: "sourceIconAppleDarkSrc",
    cid: CONTACT_IMPORT_ICON_CIDS.appleDark,
    filename: "apple-dark.png",
  },
  {
    variableKey: "sourceIconCsvSrc",
    cid: CONTACT_IMPORT_ICON_CIDS.csv,
    filename: "csv-upload.png",
  },
];

/** `src` values for template placeholders — must be sent with matching CID attachments. */
export function getContactImportSourceIconVariables(): Record<string, string> {
  return Object.fromEntries(
    ICON_FILES.map(({ variableKey, cid }) => [variableKey, `cid:${cid}`])
  );
}
