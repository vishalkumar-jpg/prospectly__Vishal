import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { REDIS_TOKEN } from "config/redis.provider";
import { JobExtractionService } from "modules/recruitment/job-extraction/job-extraction.service";
import type Redis from "ioredis";
import type { ParsedJobDescription } from "../candidate-search.response";
import { createHash } from "node:crypto";
import {
  CANDIDATE_SEARCH_JD_CACHE_PREFIX,
  CANDIDATE_SEARCH_JD_CACHE_TTL_SECONDS,
  CANDIDATE_SEARCH_MAX_ARRAY_SIZE,
} from "../candidate-search.constants";

/**
 * Turns a job description into search criteria. Extraction only — ranking
 * happens on the normal `/candidate-search` call once the sheet commits.
 *
 * This is the only paid surface on the page, so two things matter:
 *
 * - It reuses `job-extraction`. That module already handles files, prompts,
 *   retries and `ai-usage` logging, and a second extractor would be a second
 *   prompt to keep in step with the first.
 * - Results are cached by **content hash**. Pasting the same description twice
 *   is the normal way to use this — tweak a filter, come back, paste again — and
 *   it must not bill twice.
 */
@Injectable()
export class CandidateSearchJdService {
  private readonly logger = new Logger(CandidateSearchJdService.name);

  constructor(
    private readonly jobExtraction: JobExtractionService,
    @Optional() @Inject(REDIS_TOKEN) private readonly redis?: Redis
  ) {}

  async parseText(text: string, userId: string): Promise<ParsedJobDescription> {
    const key = this.cacheKey(text);

    const cached = await this.readCache(key);
    if (cached) {
      this.logger.log("CANDIDATE_SEARCH_JD_SERVICE :: parseText : CACHE_HIT");
      return cached;
    }

    const extracted = await this.jobExtraction.extractFromText(text, {
      userId,
      actionType: "candidate_search_jd_parse",
    });

    const parsed: ParsedJobDescription = {
      role: extracted.title?.trim() || null,
      seniority: extracted.experienceLevel?.trim() || null,
      // Required skills become filters; preferred ones only score (`bonus`), so
      // a nice-to-have can never exclude somebody who is otherwise a match.
      mustHave: this.capSkills(extracted.requiredSkills),
      niceToHave: this.capSkills(extracted.preferredSkills),
    };

    await this.writeCache(key, parsed);
    return parsed;
  }

  async parseFile(
    buffer: Buffer,
    mimetype: string,
    userId: string
  ): Promise<ParsedJobDescription> {
    // Hashed on the bytes, so re-uploading the same file is free too.
    const key = this.cacheKey(buffer);

    const cached = await this.readCache(key);
    if (cached) {
      this.logger.log("CANDIDATE_SEARCH_JD_SERVICE :: parseFile : CACHE_HIT");
      return cached;
    }

    const extracted = await this.jobExtraction.extractFromFile(
      buffer,
      mimetype,
      { userId, actionType: "candidate_search_jd_parse" }
    );

    const parsed: ParsedJobDescription = {
      role: extracted.title?.trim() || null,
      seniority: extracted.experienceLevel?.trim() || null,
      mustHave: this.capSkills(extracted.requiredSkills),
      niceToHave: this.capSkills(extracted.preferredSkills),
    };

    await this.writeCache(key, parsed);
    return parsed;
  }

  /**
   * Capped to the same ceiling the DTO enforces. A description listing forty
   * skills would otherwise commit criteria the drawer rejects, and the
   * mismatch would only surface as a 400 on the next search.
   */
  private capSkills(values: string[] | undefined): string[] {
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of values) {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length >= CANDIDATE_SEARCH_MAX_ARRAY_SIZE) break;
    }
    return out;
  }

  /** Version segment bumps when the parsed shape changes, per the planner's pattern. */
  private cacheKey(content: string | Buffer): string {
    const hash = createHash("sha256").update(content).digest("hex");
    return `${CANDIDATE_SEARCH_JD_CACHE_PREFIX}${hash}`;
  }

  private async readCache(key: string): Promise<ParsedJobDescription | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as ParsedJobDescription) : null;
    } catch (error) {
      // A cache miss is always survivable; a cache error must not cost the user
      // their parse.
      this.logger.warn(
        `CANDIDATE_SEARCH_JD_SERVICE :: readCache : ERROR : ${error}`
      );
      return null;
    }
  }

  private async writeCache(
    key: string,
    parsed: ParsedJobDescription
  ): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(
        key,
        JSON.stringify(parsed),
        "EX",
        CANDIDATE_SEARCH_JD_CACHE_TTL_SECONDS
      );
    } catch (error) {
      this.logger.warn(
        `CANDIDATE_SEARCH_JD_SERVICE :: writeCache : ERROR : ${error}`
      );
    }
  }
}
