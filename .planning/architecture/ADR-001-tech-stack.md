# ADR-001: Technology Stack

**Status:** Accepted
**Date:** 2026-02-06
**Author:** Claude Code (documented from existing implementation)

## Context

Prospectly is a SaaS platform for managing introductions, contacts, and marketplace deals. It requires a full-stack solution supporting web and mobile (iOS/Android), real-time background processing, payment handling, and multi-provider OAuth integration.

## Decision

| Layer | Choice |
|-------|--------|
| Runtime | Bun (package manager + runtime) |
| Node | v22.16.0 (pinned via .nvmrc) |
| Backend | NestJS 11 with Express 5 |
| Frontend | React 18 with Vite + SWC |
| Database | PostgreSQL with Drizzle ORM |
| Cache/Queue | Redis with BullMQ (@nestjs/bullmq) |
| CSS | Tailwind CSS |
| UI Components | Radix UI primitives |
| Mobile | Capacitor (iOS + Android) |
| Deployment | Docker (Bun runtime) |

## Consequences

### Positive
- Bun provides significantly faster dependency installation and script execution than npm/yarn
- NestJS provides strong structure with dependency injection, guards, interceptors, and module system
- Drizzle ORM offers SQL-like API with excellent TypeScript inference and lightweight runtime
- React Query eliminates boilerplate for server state management
- Capacitor enables single codebase for web + mobile
- Radix UI provides accessible primitives out of the box

### Negative
- Bun ecosystem is newer — some npm packages may have compatibility issues
- Drizzle has smaller community than Prisma — fewer tutorials and examples
- Capacitor requires platform-specific testing for iOS/Android
- NestJS has a learning curve for developers unfamiliar with Angular-style DI

### Neutral
- Express 5 is the underlying HTTP framework (via NestJS adapter)
- TypeScript is used everywhere (server + client)
- Monorepo structure (server/ + client/) without workspace tooling

## Alternatives Considered

### Prisma (instead of Drizzle)
- **Pros:** Larger community, more tooling, schema-first approach
- **Cons:** Heavier runtime, generates client code, less SQL control
- **Why rejected:** Drizzle's SQL-like API and TypeScript inference were preferred for performance and developer experience

### Next.js (instead of React + Vite)
- **Pros:** SSR, file-based routing, API routes
- **Cons:** Server coupling, more opinionated, harder to integrate with NestJS
- **Why rejected:** Separate backend (NestJS) was preferred for complex business logic, background jobs, and webhook handling
