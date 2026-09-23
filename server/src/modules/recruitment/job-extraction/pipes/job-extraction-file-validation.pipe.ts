import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import { JOB_EXTRACTION_ERRORS } from "../job-extraction.constants";
import { MAX_FILE_SIZE } from "../job-extraction.dto";

@Injectable()
export class JobExtractionFileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(JOB_EXTRACTION_ERRORS.FILE_REQUIRED);
    }

    // Check file size (5MB)
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(JOB_EXTRACTION_ERRORS.FILE_TOO_LARGE);
    }

    // Check MIME type
    if (file.mimetype !== "application/pdf") {
      throw new BadRequestException(JOB_EXTRACTION_ERRORS.INVALID_FILE_TYPE);
    }

    return file;
  }
}
