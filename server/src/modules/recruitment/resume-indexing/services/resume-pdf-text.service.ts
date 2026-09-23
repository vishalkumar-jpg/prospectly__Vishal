import { Injectable, Logger } from "@nestjs/common";
import { extractText } from "unpdf";
import {
  RESUME_INDEXING_MAX_PDF_BYTES,
  RESUME_PDF_EXTRACT_TIMEOUT_MS,
} from "../resume-indexing.constants";
import { isValidPdfBuffer } from "../../resume-extraction/resume-extraction.constants";

export interface PdfTextResult {
  text: string;
  pages: number;
}

const EMPTY_RESULT: PdfTextResult = { text: "", pages: 0 };

@Injectable()
export class ResumePdfTextService {
  private readonly logger = new Logger(ResumePdfTextService.name);

  /**
   * Never throws. A resume we cannot read is not a failed job — the caller
   * falls back to the structured extraction fields and flags the row so a
   * later OCR pass can revisit it.
   */
  async extract(buffer: Buffer, mediaId: string): Promise<PdfTextResult> {
    if (buffer.length > RESUME_INDEXING_MAX_PDF_BYTES) {
      this.logger.warn(
        `RESUME_PDF_TEXT_SERVICE :: extract : file_too_large : mediaId=${mediaId} size=${buffer.length}`
      );
      return EMPTY_RESULT;
    }

    if (!isValidPdfBuffer(buffer)) {
      this.logger.warn(
        `RESUME_PDF_TEXT_SERVICE :: extract : invalid_pdf_bytes : mediaId=${mediaId}`
      );
      return EMPTY_RESULT;
    }

    try {
      const result = await this.withTimeout(
        extractText(new Uint8Array(buffer), { mergePages: true }),
        mediaId
      );

      const text = Array.isArray(result.text)
        ? result.text.join("\n")
        : result.text;

      return { text: text ?? "", pages: result.totalPages ?? 0 };
    } catch (error) {
      this.logger.error(
        `RESUME_PDF_TEXT_SERVICE :: extract : ERROR : mediaId=${mediaId} ${error}`
      );
      return EMPTY_RESULT;
    }
  }

  /** pdf.js can spin indefinitely on a malformed xref table. */
  private async withTimeout<T>(
    promise: Promise<T>,
    mediaId: string
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(`PDF text extraction timed out (mediaId: ${mediaId})`)
          ),
        RESUME_PDF_EXTRACT_TIMEOUT_MS
      );
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
