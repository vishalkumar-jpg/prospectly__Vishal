import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, isNull, ilike, count, desc } from "drizzle-orm";
import { parseClampPagination } from "utils/pagination.utils";
import {
  BankQuestionExistsDto,
  ListBankQuestionsDto,
} from "./recruitment-assessment-bank.dto";
import { bankQuestionTextExists } from "./assessment-question-text.util";

@Injectable()
export class RecruitmentAssessmentBankService {
  private readonly logger = new Logger(RecruitmentAssessmentBankService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /** List the current user's own bank questions (paginated + searchable). */
  async list(userId: string, query: ListBankQuestionsDto) {
    const { newLimit } = parseClampPagination(
      query.limit ?? "10",
      undefined,
      10,
      50
    );
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const offset = (page - 1) * newLimit;

    const table = schema.recruitmentAssessmentQuestionBankSchema;
    const conditions = [eq(table.createdBy, userId), isNull(table.deletedAt)];

    const search = query.search?.trim();
    if (search) {
      conditions.push(ilike(table.questionText, `%${search}%`));
    }
    const whereClause = and(...conditions);

    const [rows, [totalResult]] = await Promise.all([
      this.db
        .select()
        .from(table)
        .where(whereClause)
        .orderBy(desc(table.createdAt))
        .limit(newLimit)
        .offset(offset),
      this.db.select({ total: count() }).from(table).where(whereClause),
    ]);

    const total = totalResult?.total ?? 0;
    const totalPages = Math.ceil(total / newLimit);

    return {
      questions: rows,
      pagination: {
        page,
        limit: newLimit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /** Case-insensitive exact match against the current user's bank. */
  async exists(userId: string, query: BankQuestionExistsDto) {
    const exists = await bankQuestionTextExists(
      this.db,
      userId,
      query.questionText
    );
    return { exists };
  }
}
