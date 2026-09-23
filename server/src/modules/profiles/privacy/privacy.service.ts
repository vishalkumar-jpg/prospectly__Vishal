import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import { eq, and, ilike, sql, desc, asc, inArray, or } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { plainToInstance } from "class-transformer";
import { MessageResponse } from "modules/swagger/dtos/response.dtos";
import { toUTC } from "utils/dayjs";
import { CreateDto, UpdateDto, QueryDto, BulkDeleteDto } from "./privacy.dto";
import { PrivacyResponse, PrivacyListResponse } from "./privacy.response";
import { MESSAGES, SortOrderEnum } from "./privacy.constants";

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Create a new privacy setting
   * @param userId - The user ID
   * @param createDto - The create DTO
   * @returns The created privacy setting
   */
  async create(userId: string, createDto: CreateDto): Promise<MessageResponse> {
    try {
      // Check if domain already exists for this user
      const existing = await this.db.query.privacy.findFirst({
        where: and(
          eq(schema.privacy.userId, userId),
          eq(schema.privacy.domain, createDto.domain)
        ),
      });

      if (existing) {
        throw new BadRequestException(MESSAGES.ERROR.DUPLICATE_DOMAIN);
      }

      const [result] = await this.db
        .insert(schema.privacy)
        .values({
          userId,
          domain: createDto.domain,
          reason: createDto.reason,
          hideProfile: createDto.hideProfile ?? false,
          hideBounties: createDto.hideBounties ?? false,
          excludeFromSearch: createDto.excludeFromSearch ?? false,
          createdBy: userId,
        })
        .returning();

      this.logger.log(
        `Privacy setting created: ${result.id} for user: ${userId}`
      );

      return { message: MESSAGES.INFO.CREATED };
    } catch (error) {
      this.logger.error(
        `SERVICE :: create :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : MESSAGES.ERROR.INVALID_DATA
      );
    }
  }

  /**
   * Update a privacy setting
   * @param id - The privacy setting ID
   * @param userId - The user ID (for authorization)
   * @param updateDto - The update DTO
   * @returns The updated privacy setting
   */
  async update(
    id: string,
    userId: string,
    updateDto: UpdateDto
  ): Promise<MessageResponse> {
    try {
      // Find the record and verify ownership
      const record = await this.db.query.privacy.findFirst({
        where: and(
          eq(schema.privacy.id, id),
          eq(schema.privacy.userId, userId)
        ),
      });

      if (!record) {
        throw new NotFoundException(MESSAGES.ERROR.NOT_FOUND);
      }

      // If domain is being updated, check for duplicates
      if (updateDto.domain && updateDto.domain !== record.domain) {
        const existing = await this.db.query.privacy.findFirst({
          where: and(
            eq(schema.privacy.userId, userId),
            eq(schema.privacy.domain, updateDto.domain)
          ),
        });

        if (existing && existing.id !== id) {
          throw new BadRequestException(MESSAGES.ERROR.DUPLICATE_DOMAIN);
        }
      }

      const updateData: Partial<typeof schema.privacy.$inferInsert> = {
        updatedBy: userId,
        updatedAt: toUTC(),
        ...updateDto,
      };

      await this.db
        .update(schema.privacy)
        .set(updateData)
        .where(eq(schema.privacy.id, id));

      this.logger.log(`Privacy setting updated: ${id} by user: ${userId}`);

      return { message: MESSAGES.INFO.UPDATED };
    } catch (error) {
      this.logger.error(
        `SERVICE :: update :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : MESSAGES.ERROR.INVALID_DATA
      );
    }
  }

  /**
   * Find all privacy settings with filters, sorting, and pagination
   * @param userId - The user ID
   * @param query - The query DTO
   * @returns The privacy settings and pagination details
   */
  async findAll(userId: string, query: QueryDto): Promise<PrivacyListResponse> {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = SortOrderEnum.DESC,
      search,
      isPagination = true,
    } = query;

    try {
      // Build where conditions
      const conditions = [eq(schema.privacy.userId, userId)];

      // Add search condition if provided (search in domain and reason fields)
      if (search) {
        conditions.push(
          or(
            ilike(schema.privacy.domain, `%${search}%`),
            ilike(schema.privacy.reason, `%${search}%`)
          )
        );
      }

      const whereClause = and(...conditions);

      // Get total count
      const totalResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.privacy)
        .where(whereClause);

      const total = Number(totalResult[0]?.count || 0);

      // Build query for data
      const sortField = sort === "domain" ? "domain" : "createdAt";
      const orderByClause =
        order === SortOrderEnum.ASC
          ? asc(schema.privacy[sortField])
          : desc(schema.privacy[sortField]);

      // Build base query
      const baseQuery = this.db
        .select()
        .from(schema.privacy)
        .where(whereClause)
        .orderBy(orderByClause);

      // Apply pagination conditionally
      const data = isPagination
        ? await baseQuery.limit(limit).offset((page - 1) * limit)
        : await baseQuery;

      // Transform to response format
      const transformedData = plainToInstance(PrivacyResponse, data, {
        excludeExtraneousValues: true,
      });

      return {
        data: transformedData,
        total,
        page: isPagination ? page : 1,
        limit: isPagination ? limit : total,
        totalPages: isPagination ? Math.ceil(total / limit) : 1,
      };
    } catch (error) {
      this.logger.error(
        `SERVICE :: findAll :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      throw new BadRequestException(
        error instanceof Error ? error.message : MESSAGES.ERROR.INVALID_DATA
      );
    }
  }

  /**
   * Delete privacy settings (permanent delete)
   * @param userId - The user ID
   * @param deleteDto - The delete DTO with IDs array
   * @returns Success message
   */
  async remove(
    userId: string,
    deleteDto: BulkDeleteDto
  ): Promise<MessageResponse> {
    try {
      // Verify all records belong to the user
      const records = await this.db
        .select()
        .from(schema.privacy)
        .where(
          and(
            eq(schema.privacy.userId, userId),
            inArray(schema.privacy.id, deleteDto.ids)
          )
        );

      if (records.length === 0) {
        return { message: MESSAGES.INFO.DELETED };
      }

      // Permanent delete
      const ids = records.map((r) => r.id);
      await this.db
        .delete(schema.privacy)
        .where(inArray(schema.privacy.id, ids));

      this.logger.log(
        `Privacy settings deleted permanently: ${ids.length} by user: ${userId}`
      );

      return { message: MESSAGES.INFO.DELETED };
    } catch (error) {
      this.logger.error(
        `SERVICE :: remove :: ERROR :: ${JSON.stringify(error)}`,
        error
      );
      throw new BadRequestException(
        error instanceof Error ? error.message : MESSAGES.ERROR.INVALID_DATA
      );
    }
  }
}
