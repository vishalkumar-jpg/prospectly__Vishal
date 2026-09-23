import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EMAIL_TEMPLATE_SEED_DATA } from "./email-templates.seed-data";
import { loadEmailTemplateHtml } from "./email-template-files.loader";

@Injectable()
export class EmailTemplateSeeder {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async seedDefaultEmailTemplates() {
    for (const entry of EMAIL_TEMPLATE_SEED_DATA) {
      const htmlContent = loadEmailTemplateHtml(entry.file);

      const existing = await this.db.query.emailTemplateSchema.findFirst({
        where: and(
          eq(schema.emailTemplateSchema.slug, entry.slug),
          isNull(schema.emailTemplateSchema.deletedAt)
        ),
      });

      if (existing) {
        // Templates are maintained in admin UI; seed only creates missing slugs.
        continue;
      }

      await this.db.insert(schema.emailTemplateSchema).values({
        name: entry.name,
        subject: entry.subject,
        slug: entry.slug,
        htmlContent,
        usageCount: 0,
        category: entry.category,
        description: entry.description,
        status: entry.status,
      });
    }
  }
}
