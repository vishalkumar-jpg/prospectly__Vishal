import {
  Injectable,
  BadRequestException,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { sql, inArray, eq } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { maskEmail } from "utils/maskingUtils";
import { MessageResponse } from "modules/swagger/dtos/response.dtos";
import { CreateDisputeDto } from "./disputes.dto";
import { QueryDisputeDto, BulkDeleteDto } from "./disputes-query.dto";
import {
  DISPUTES_MESSAGES,
  DisputeSortFieldEnum,
  SortOrderEnum,
} from "./disputes.constants";
import { DisputesValidateService } from "./disputes-validate.service";
import {
  determineDisputeCategory,
  buildDisputesWhereClause,
  buildDisputeCreateData,
  getDeletableDisputeIds,
  buildFindAllBaseQuery,
  getEligibleIntroductions as getEligibleIntroductionsHelper,
} from "./disputes.helpers";

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly validateService: DisputesValidateService
  ) {}

  /**
   * Create a new dispute
   * @param userId - The user ID who is filing the dispute
   * @param createDto - The create DTO
   * @returns Success message
   */
  async create(
    userId: string,
    createDto: CreateDisputeDto
  ): Promise<MessageResponse> {
    try {
      return await this.db.transaction(async (tx) => {
        const { introductionRequest, againstUserId } =
          await this.validateService.validateIntroductionRequestAndUser(
            createDto.introductionRequestId,
            userId,
            tx
          );

        await this.validateService.validateNoActiveDispute(
          createDto.introductionRequestId,
          tx
        );

        if (createDto.disputedAmount !== undefined) {
          await this.validateService.validateAmounts(
            createDto.disputedAmount,
            createDto.requestedRefundAmount,
            introductionRequest.bountyAmount
          );
        }

        await tx
          .insert(schema.disputes)
          .values(
            buildDisputeCreateData(
              createDto,
              userId,
              againstUserId,
              createDto.disputeCategory ||
                determineDisputeCategory(createDto.disputeType)
            )
          );

        this.logger.log(
          `Dispute created: ${createDto.introductionRequestId} by user: ${userId}`
        );

        return { message: DISPUTES_MESSAGES.INFO.CREATED };
      });
    } catch (error) {
      if (
        error?.code === "23505" ||
        error?.message?.includes("idx_unique_active_dispute")
      ) {
        throw new BadRequestException(
          DISPUTES_MESSAGES.ERROR.DUPLICATE_DISPUTE
        );
      }

      this.logger.error(
        `SERVICE :: create :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : DISPUTES_MESSAGES.ERROR.INVALID_DATA
      );
    }
  }

  /**
   * Find all disputes with filters, sorting, and pagination
   * @param userId - The user ID
   * @param query - The query DTO
   * @returns The disputes and pagination details
   */
  async findAll(userId: string, query: QueryDisputeDto) {
    const {
      page = 1,
      limit = 10,
      sort = DisputeSortFieldEnum.CREATED_AT,
      order = SortOrderEnum.DESC,
      isPagination = true,
    } = query;

    try {
      const whereClause = buildDisputesWhereClause(userId, query);

      const total = Number(
        (
          await this.db
            .select({ count: sql<number>`count(*)` })
            .from(schema.disputes)
            .where(whereClause)
        )[0]?.count || 0
      );

      const baseQuery = buildFindAllBaseQuery(
        this.db,
        whereClause,
        sort,
        order
      );

      const data = isPagination
        ? await baseQuery.limit(limit).offset((page - 1) * limit)
        : await baseQuery;

      const mappedData = data.map((item) => ({
        ...item,
        againstUserEmail: maskEmail(item.againstUserEmail),
      }));

      return {
        data: mappedData,
        total,
        page: isPagination ? page : 1,
        limit: isPagination ? (limit > 0 ? limit : 10) : total,
        totalPages: isPagination && limit > 0 ? Math.ceil(total / limit) : 1,
      };
    } catch (error) {
      this.logger.error(
        `SERVICE :: findAll :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : DISPUTES_MESSAGES.ERROR.INVALID_DATA
      );
    }
  }

  /**
   * Find a single dispute by ID
   * @param id - The dispute ID
   * @param userId - The user ID (for authorization)
   * @returns The dispute
   */
  async findOne(id: string, userId: string) {
    await this.validateService.validateDisputeAccess(id, userId);

    const data = await buildFindAllBaseQuery(
      this.db,
      eq(schema.disputes.id, id),
      DisputeSortFieldEnum.CREATED_AT,
      SortOrderEnum.DESC
    );

    if (!data.length) {
      throw new NotFoundException(DISPUTES_MESSAGES.ERROR.NOT_FOUND);
    }

    const mappedData = data.map((item) => ({
      ...item,
      againstUserEmail: maskEmail(item.againstUserEmail),
    }));

    return mappedData[0];
  }

  /**
   * Delete disputes (bulk delete)
   * @param userId - The user ID
   * @param deleteDto - The delete DTO with IDs array
   * @returns Success message
   */
  async remove(
    userId: string,
    deleteDto: BulkDeleteDto
  ): Promise<MessageResponse> {
    try {
      const ids = await getDeletableDisputeIds(this.db, userId, deleteDto.ids);

      if (ids.length === 0) {
        return { message: DISPUTES_MESSAGES.INFO.DELETED };
      }

      await this.db
        .delete(schema.disputes)
        .where(inArray(schema.disputes.id, ids));

      this.logger.log(`Disputes deleted: ${ids.length} by user: ${userId}`);

      return { message: DISPUTES_MESSAGES.INFO.DELETED };
    } catch (error) {
      this.logger.error(
        `SERVICE :: remove :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : DISPUTES_MESSAGES.ERROR.INVALID_DATA
      );
    }
  }

  /**
   * Get introduction requests that are eligible for filing a dispute
   * @param userId - The requester's user ID
   * @returns Array of eligible introduction requests
   */
  async getEligibleIntroductions(userId: string, query: QueryDisputeDto) {
    return getEligibleIntroductionsHelper(this.db, userId, query);
  }
}
