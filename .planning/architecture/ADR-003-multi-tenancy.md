# ADR-003: Multi-Tenancy Model

**Status:** Accepted
**Date:** 2026-02-06
**Author:** Claude Code (documented from existing implementation)

## Context

Prospectly is a multi-user platform where users belong to organisations. Data isolation between organisations is critical — users should only see data belonging to their organisation. The tenancy model affects every database query, API response, and background job.

## Decision

**Organisation-based scoping with shared database schema.**

All data is stored in shared PostgreSQL tables. Data isolation is enforced by filtering on `organisationId` in every query. There is no schema-per-tenant or database-per-tenant isolation.

### Implementation Pattern
```typescript
// Every query must scope by organisation
const contacts = await db.select()
  .from(contactsTable)
  .where(
    and(
      eq(contactsTable.organisationId, user.organisationId),
      isNull(contactsTable.deletedAt)  // soft delete filter
    )
  );
```

### Organisation Structure
| Table | Purpose |
|-------|---------|
| `organisation` | Organisation profile and settings |
| `organisation_member` | User-organisation membership with roles |
| `organisation_invite` | Pending invitations |
| `organisation_leader_permissions` | Leader-specific permissions |

### Data Owned by Organisation
- Contacts and contact relationships
- Introduction requests
- Marketplace shares
- Payment records
- Subscription (per organisation)

### Data Owned by User (cross-organisation)
- User profile and auth tokens
- Trust score and badges
- Calendar integrations
- Credit balance

## Consequences

### Positive
- Simplest implementation — no schema management overhead
- Easy to query across organisations for admin/system views
- No migration complexity when adding new tenants
- Lower infrastructure cost (single database)

### Negative
- Every query MUST include organisation scoping — missing filter = data leak
- No physical isolation between tenants — noisy neighbor possible
- Database performance scales with total data, not per-tenant data
- Cannot easily give a tenant their own backup/restore

### Neutral
- Soft deletes (`deletedAt IS NULL`) add an additional filter to every query
- Background jobs must also scope by organisation
- Admin endpoints may need to bypass organisation scoping

## Alternatives Considered

### Schema-Per-Tenant
- **Pros:** Stronger isolation, per-tenant backups, independent migrations
- **Cons:** Schema management complexity, migration overhead, connection pooling challenges
- **Why rejected:** Overkill for current scale; organisation-scoping is sufficient

### Database-Per-Tenant
- **Pros:** Complete isolation, independent scaling
- **Cons:** Very high infrastructure cost, complex deployment, cross-tenant queries impossible
- **Why rejected:** Not justified for a SaaS platform at current and projected scale

## References

- Organisation schema: `server/src/database/schema/organisation.schema.ts`
- Member schema: `server/src/database/schema/organisation.member.schema.ts`
