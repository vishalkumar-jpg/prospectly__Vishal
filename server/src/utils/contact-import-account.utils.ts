export function normalizeImportAccountEmail(
  email: string | null | undefined
): string {
  if (!email || typeof email !== "string") {
    return "";
  }
  return email.trim().toLowerCase();
}
