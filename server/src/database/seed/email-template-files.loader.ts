import { readFileSync, existsSync } from "fs";
import { join } from "path";

const TEMPLATES_DIR = join(__dirname, "../../templates");

export function loadEmailTemplateHtml(fileName: string): string {
  const filePath = join(TEMPLATES_DIR, fileName);

  if (!existsSync(filePath)) {
    throw new Error(
      `Email template file not found: ${filePath}. Expected under server/src/templates/`
    );
  }

  return readFileSync(filePath, "utf-8").trim();
}
