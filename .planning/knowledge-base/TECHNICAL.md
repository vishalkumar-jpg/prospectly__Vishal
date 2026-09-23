# Technical Decisions & Stack

This document records the technology stack, external integrations, architecture patterns, and key technical decisions for Prospectly.

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Bun | Latest |
| Node | v22.16.0 | (via .nvmrc) |
| Backend | NestJS | 11 |
| HTTP | Express | 5 |
| Frontend | React | 18 |
| Build | Vite + SWC | Latest |
| CSS | Tailwind CSS | Latest |
| UI | Radix UI | Latest |
| ORM | Drizzle ORM | Latest |
| Database | PostgreSQL | Latest |
| Cache | Redis (ioredis) | Latest |
| Queue | BullMQ (@nestjs/bullmq) | Latest |
| Auth | Passport + JWT + bcryptjs | Latest |
| Storage | AWS S3 (presigned URLs) | Latest |
| Payments | Stripe | Latest |
| Email | Resend | Latest |
| Monitoring | Sentry (server), LogRocket (client) | Latest |
| Mobile | Capacitor | Latest |

---

## External Integrations (11)

1. **Google** (OAuth, Gmail, Contacts, Calendar — also used for interview Google Meet events)
2. **Microsoft** (OAuth, Outlook, Contacts via Graph API, Calendar — also used for interview Teams events)
3. **Apple** (iCloud Contacts via app-specific passwords)
4. **LinkedIn** (ZIP file export import)
5. **Stripe** (Payments, Subscriptions, Connect payouts, Recruitment two-step payment authorization + capture)
6. **Resend** (transactional email with Svix webhook verification — also used for interview invites and consent emails)
7. **Clay.com** (contact enrichment API)
8. **AWS S3** (file storage, presigned URLs, 15min expiry — also used for candidate resume uploads)
9. **Sentry** (server error tracking)
10. **LogRocket** (client session replay)
11. **OpenAI** (768-dim embeddings for job/contact vectors + LLM scoring for recruitment AI matching)

---

## Architecture Patterns

### Monorepo Structure
- `server/` — NestJS 11 backend (Express 5, TypeScript, port 5001 dev / 5000 prod)
- `client/` — React 18 frontend (Vite + SWC, Tailwind CSS, port 5000 dev)

### Module Pattern
- Self-contained modules in `server/src/modules/<feature>/`
- Each module contains: module, controller, service, DTO, constants, and optionally response types
- Controllers handle routing only; all business logic lives in services

### Background Jobs
- BullMQ queues with Redis for async task processing
- Separate worker process (`server/src/worker.ts`) on port 5002
- Processors registered in `server/src/worker/worker.module.ts`

### Multi-Tenancy
- Organisation-based scoping (not schema-per-tenant)
- All data queries scoped by organisation ID
- Users belong to organisations

### Authentication
- JWT in httpOnly cookies
- Global guards: JwtAuthGuard, CsrfGuard, ThrottlerGuard
- Decorator-based overrides: `@Public()`, `@SkipCSRF()`, `@Throttle()`

### API Design
- REST with global prefix `/api`
- Swagger documentation available in development only
- Response format via `responseUtils.success()` and `responseUtils.error()`

### Client State Management
- React Query for server state (caching, refetching, mutations)
- Context API for auth state (`AuthContext`) and import progress
- No Redux or Zustand

### Deployment
- Docker with Bun runtime
- Non-root user in container
- Production build: `tsc` + `tsc-alias` for path resolution

---

## Key Technical Decisions

### 1. Bun over Node/npm
- **Decision**: Use Bun as the package manager and runtime
- **Rationale**: Significantly faster dependency installation and script execution
- **Trade-off**: Smaller ecosystem, less community support compared to Node/npm

### 2. Drizzle over Prisma
- **Decision**: Use Drizzle ORM for database access
- **Rationale**: Lighter weight, SQL-like API that feels natural, better TypeScript type inference, no code generation step
- **Trade-off**: Fewer built-in features (no auto-migrations, less tooling)

### 3. React Query over Redux
- **Decision**: Use TanStack React Query for server state management
- **Rationale**: Purpose-built for server state, eliminates boilerplate of Redux actions/reducers, built-in caching and refetching
- **Trade-off**: Not suitable for complex client-only state (mitigated by Context API for the few cases needed)

### 4. httpOnly Cookies over localStorage Tokens
- **Decision**: Store JWT tokens in httpOnly cookies instead of localStorage
- **Rationale**: XSS-resistant; JavaScript cannot access httpOnly cookies, preventing token theft via cross-site scripting
- **Trade-off**: Requires CSRF protection (implemented via double-submit pattern), slightly more complex auth setup

### 5. BullMQ over In-Process
- **Decision**: Use BullMQ with Redis for background job processing instead of in-process execution
- **Rationale**: Scalable, reliable, supports retries and delayed jobs, separate worker process doesn't block API
- **Trade-off**: Additional infrastructure (Redis required), more operational complexity

### 6. Presigned URLs over Direct Upload
- **Decision**: Use S3 presigned URLs for file uploads instead of proxying through the server
- **Rationale**: Uploads go directly from client to S3, reducing server load and bandwidth; 15-minute URL expiry limits exposure
- **Trade-off**: Slightly more complex client-side upload logic, requires CORS configuration on S3 bucket

### 7. Single Charge at Hire for Recruitment
- **Decision**: Charge the recruiter once, with an immediate create-and-capture PaymentIntent, when a candidate is moved to Hired. Posting, shortlisting, and interview booking are free.
- **Rationale**: The recruiter only pays for an outcome they actually got. Removing the earlier authorize-at-shortlist / capture-at-booking model (and later the 5% shortlist deposit) eliminated expiring authorization holds and partial-capture reconciliation entirely.
- **Trade-off**: The card is not validated until hire, so a missing or failed payment method surfaces late — mitigated by checking it in the hire dialog before submit and blocking the hire server-side.

### 8. OpenAI Embeddings for Job-Candidate Matching
- **Decision**: Use 768-dim OpenAI embeddings + LLM scoring for AI-powered job-to-candidate matching
- **Rationale**: Semantic matching captures skill/role alignment better than keyword matching. Two-phase approach (cosine similarity → LLM) balances cost and accuracy.
- **Trade-off**: OpenAI API dependency and cost, embedding computation is async (BullMQ), matches are not real-time
