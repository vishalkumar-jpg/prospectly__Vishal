---
paths:
  - "server/**"
---

# Server-Side Patterns (NestJS)

## Module Structure

Every feature lives in `server/src/modules/<feature>/` with these files:
- `<name>.module.ts` — module definition (register in `app.module.ts`)
- `<name>.controller.ts` — HTTP routes ONLY, no business logic
- `<name>.service.ts` — ALL business logic and database queries
- `<name>.dto.ts` — class-validator DTOs for request validation
- `<name>.constants.ts` — module-specific constants
- `<name>.response.ts` — response type definitions (optional)

## Response Format

Always use the standard response utilities:
```typescript
import { responseUtils } from "utils/response.utils";

// Success
return responseUtils.success(res, { data });

// Error
return responseUtils.error({ res, error });
```

## Error Logging

Follow this exact format in all controllers and services:
```typescript
this.logger.error(`MODULE_CONTROLLER :: METHOD_NAME : ERROR : ${error}`);
```
Never use `console.log` — use NestJS `Logger` instead.

## Database Rules

- Inject via `@Inject(DRIZZLE_TOKEN)`
- ALL queries must filter `deletedAt IS NULL` (soft deletes)
- ALL timestamps must use `toUTC()` from `utils/dayjs`, never `new Date()`
- Multi-step operations MUST use `db.transaction(async (tx) => { ... })` — use `tx` not `db` inside
- All tables include: `id`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`

## Auth & Security Guards

- All routes are JWT-protected by default via global `JwtAuthGuard`
- Use `@Public()` decorator to make a route unauthenticated
- Use `@SkipCSRF()` for webhook endpoints
- Use `@Throttle({ default: { limit: N, ttl: MS } })` for rate-sensitive endpoints
- Auth endpoints (login, refresh, OAuth) should have stricter rate limits
- Paginated endpoints MUST cap `limit` with `Math.min(requested, MAX)` (max 100)

## Validation

- Use class-validator DTOs for ALL request bodies and query params
- Enable `whitelist: true` and `forbidNonWhitelisted: true` (globally configured)
- Sanitize user-provided HTML with `sanitize-html` before storing or rendering

## Listing APIs — Pagination & Search

**ALL listing/index endpoints MUST use backend-side pagination and search.** Never return unbounded result sets or rely on client-side filtering.

### Pagination Rules:
- Every listing endpoint MUST accept `page` (default: 1) and `limit` (default: 10) query params
- Cap `limit` with `Math.min(requested, 100)` — never allow unlimited results
- Return pagination metadata in the response: `{ data, meta: { page, limit, total, totalPages } }`
- Calculate `totalPages` as `Math.ceil(total / limit)`
- Use `offset = (page - 1) * limit` for SQL offset calculation
- The DTO must validate `page` and `limit` as positive integers using `class-validator`

### Search Rules:
- Every listing endpoint MUST accept an optional `search` query param for backend-side search
- Use `ILIKE` with `%search%` pattern for text search in PostgreSQL (via Drizzle `ilike()`)
- Search should cover the most relevant columns (e.g., name, email, title) — not all columns
- Never perform search/filtering on the client side — always send the search term to the API
- Sanitize search input before using in queries (trim whitespace, escape special characters)

### Listing DTO Pattern:
```typescript
import { IsOptional, IsInt, Min, Max, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

// Add these to your query DTO for every listing endpoint:
@ApiPropertyOptional({ description: "Page number", default: 1 })
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
page?: number = 1;

@ApiPropertyOptional({ description: "Items per page", default: 10 })
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
@Max(100)
limit?: number = 10;

@ApiPropertyOptional({ description: "Search term" })
@IsOptional()
@IsString()
search?: string;
```

### Listing Response Pattern:
```typescript
const page = dto.page ?? 1;
const limit = Math.min(dto.limit ?? 10, 100);
const offset = (page - 1) * limit;
const search = dto.search?.trim();

// Build query with search filter
let query = db.select().from(table).where(isNull(table.deletedAt));

if (search) {
  query = query.where(ilike(table.name, `%${search}%`));
}

const [data, [{ total }]] = await Promise.all([
  query.limit(limit).offset(offset),
  db.select({ total: count() }).from(table).where(/* same filters */),
]);

return responseUtils.success(res, {
  data,
  meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
});
```

## Background Jobs

- BullMQ queues with Redis
- Processors in `server/src/worker/worker.module.ts`
- Queue names as constants in the module's `constants.ts`
