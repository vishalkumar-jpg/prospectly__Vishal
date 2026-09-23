import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FileInterceptor } from "@nestjs/platform-express";
import { MAX_FILE_SIZE as JOB_EXTRACTION_MAX_FILE_SIZE } from "modules/recruitment/job-extraction/job-extraction.dto";
import { JobExtractionFileValidationPipe } from "modules/recruitment/job-extraction/pipes/job-extraction-file-validation.pipe";
import { Response } from "express";
import { CurrentUser } from "decorators/current-user.decorator";
import { RequireModule } from "decorators/require-module.decorator";
import responseUtils from "utils/response.utils";
import { describeDbError } from "utils/db-error.utils";
import { CANDIDATE_SEARCH_ROUTE } from "./candidate-search.constants";
import {
  CandidateSearchCountDto,
  CandidateSearchDto,
  CandidateSearchFacetsDto,
  CandidateSearchJdParseDto,
  SavedSearchCreateDto,
  SavedSearchFavoriteDto,
  SavedSearchRenameDto,
} from "./candidate-search.dto";
import {
  CandidateSearchJdService,
  CandidateSearchSavedService,
  CandidateSearchService,
} from "./services";

/**
 * Routes only. Row visibility is resolved once, inside the service's scope
 * resolver — a handler that built its own filter would be a second definition
 * of tenancy (plan §5.3).
 */
@Controller(CANDIDATE_SEARCH_ROUTE)
export class CandidateSearchController {
  private readonly logger = new Logger(CandidateSearchController.name);

  constructor(
    private readonly candidateSearchService: CandidateSearchService,
    private readonly jdService: CandidateSearchJdService,
    private readonly savedService: CandidateSearchSavedService
  ) {}

  @RequireModule("recruiting")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post()
  async search(
    @CurrentUser("userId") userId: string,
    @Body() dto: CandidateSearchDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.candidateSearchService.search(userId, dto);
      return responseUtils.success(res, { data });
    } catch (error) {
      // describeDbError, not `${error}`: a failure from the hybrid query
      // arrives as a DrizzleQueryError whose message is the whole statement
      // plus every bound parameter — including the 768-float embedding. The
      // stack comes from the second argument because describeDbError returns
      // a message only.
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: SEARCH : ERROR : ${describeDbError(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  /**
   * Structured-only count for the drawer footer, which recounts on every draft
   * change. A design that bills an embedding per checkbox fails review (§10.2).
   */
  @RequireModule("recruiting")
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @Post("count")
  async count(
    @CurrentUser("userId") userId: string,
    @Body() dto: CandidateSearchCountDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.candidateSearchService.count(userId, dto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: COUNT : ERROR : ${describeDbError(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  /**
   * Extraction only — ranking happens on the normal search call once the sheet
   * commits. Throttled tighter than search because it is the one paid surface
   * on the page.
   */
  @RequireModule("recruiting")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("job-description/parse")
  async parseJobDescription(
    @CurrentUser("userId") userId: string,
    @Body() dto: CandidateSearchJdParseDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.jdService.parseText(dto.text, userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: PARSE_JOB_DESCRIPTION : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequireModule("recruiting")
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get("facets")
  async facets(
    @CurrentUser("userId") userId: string,
    @Query() _query: CandidateSearchFacetsDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.candidateSearchService.facets(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: FACETS : ERROR : ${describeDbError(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  /**
   * The same extraction, from an uploaded PDF.
   *
   * Reuses job-extraction's interceptor and validation pipe rather than
   * restating the limits: that pipe already enforces PDF-only and the 5 MB
   * ceiling, and a second copy would be a second thing to keep in step.
   */
  @RequireModule("recruiting")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("job-description/parse-file")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: JOB_EXTRACTION_MAX_FILE_SIZE },
    })
  )
  async parseJobDescriptionFile(
    @CurrentUser("userId") userId: string,
    @UploadedFile(new JobExtractionFileValidationPipe())
    file: Express.Multer.File,
    @Res() res: Response
  ) {
    try {
      const data = await this.jdService.parseFile(
        file.buffer,
        file.mimetype,
        userId
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: PARSE_JOB_DESCRIPTION_FILE : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  /**
   * Saved searches are personal, so ownership is the whole authorization story
   * — the service filters every statement on `user_id` rather than checking
   * after the fact, and a row that is not yours is simply not found.
   */
  @RequireModule("recruiting")
  @Get("saved")
  async listSavedSearches(
    @CurrentUser("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.savedService.list(userId);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: LIST_SAVED_SEARCHES : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequireModule("recruiting")
  @Post("saved")
  async createSavedSearch(
    @CurrentUser("userId") userId: string,
    @Body() dto: SavedSearchCreateDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.savedService.create(userId, dto);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: CREATE_SAVED_SEARCH : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequireModule("recruiting")
  @Patch("saved/:id")
  async renameSavedSearch(
    @CurrentUser("userId") userId: string,
    @Param("id") id: string,
    @Body() dto: SavedSearchRenameDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.savedService.rename(userId, id, dto.title);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: RENAME_SAVED_SEARCH : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequireModule("recruiting")
  @Patch("saved/:id/favorite")
  async favoriteSavedSearch(
    @CurrentUser("userId") userId: string,
    @Param("id") id: string,
    @Body() dto: SavedSearchFavoriteDto,
    @Res() res: Response
  ) {
    try {
      const data = await this.savedService.setFavorite(
        userId,
        id,
        dto.isFavorite
      );
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: FAVORITE_SAVED_SEARCH : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  /** Records a rerun. Touches last_run_at only, never updated_at. */
  @RequireModule("recruiting")
  @Post("saved/:id/run")
  async runSavedSearch(
    @CurrentUser("userId") userId: string,
    @Param("id") id: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.savedService.markRun(userId, id);
      return responseUtils.success(res, { data });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: RUN_SAVED_SEARCH : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }

  @RequireModule("recruiting")
  @Delete("saved/:id")
  async deleteSavedSearch(
    @CurrentUser("userId") userId: string,
    @Param("id") id: string,
    @Res() res: Response
  ) {
    try {
      await this.savedService.remove(userId, id);
      return responseUtils.success(res, { data: { id } });
    } catch (error) {
      this.logger.error(
        `CANDIDATE_SEARCH_CONTROLLER :: DELETE_SAVED_SEARCH : ERROR : ${error}`,
        error instanceof Error ? error.stack : undefined
      );
      return responseUtils.error({ res, error: error as Error });
    }
  }
}
