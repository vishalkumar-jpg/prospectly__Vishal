import { utcDayjs } from "@/lib/dayjs";

/** Sample values for common template variables in client-side previews */
export const EMAIL_TEMPLATE_PREVIEW_VARIABLES: Record<string, string> = {
  currentYear: String(utcDayjs().year()),
  url: import.meta.env.VITE_FRONTEND_URL,
};

export function mergeEmailPreviewVariables(
  variables: Record<string, string> = {}
): Record<string, string> {
  return { ...EMAIL_TEMPLATE_PREVIEW_VARIABLES, ...variables };
}
