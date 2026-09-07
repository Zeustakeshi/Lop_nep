# External Integrations

**Analysis Date:** 2026-09-07

## Authentication & Identity

**Provider:** Clerk
- Package: `@clerk/nextjs` 6.31.8
- Auth middleware: `src/middleware.ts`
- Config helper: `src/lib/clerk-config.ts`
- Public routes: `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/report/(.*)`
- All other routes require authentication via `auth().protect()`

**Clerk Environment Variables:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Public key (prefix: `pk_`)
- `CLERK_SECRET_KEY` - Server-side secret (prefix: `sk_`)

## Database

**PostgreSQL**
- ORM: Prisma 6.15.0
- Prisma Client: Generated via `prisma generate`
- Client singleton: `src/lib/prisma.ts`
- Connection URL: `DATABASE_URL` (PostgreSQL connection string)

**Database Schema (prisma/schema.prisma):**
- Teacher - User account linked to Clerk (`clerkUserId`)
- Class - Teaching sessions
- ClassStudent - Students enrolled in classes
- ParentContact - Parent/guardian contact info
- ClassSchedule - Recurring schedule templates
- LessonSession - Individual lesson instances
- Attendance - Student attendance records
- TuitionConfig - Pricing configuration per class
- Report - Monthly billing reports
- Payment - Payment records linked to reports

## Other External Services

**None detected**
- No external API integrations (Stripe, SendGrid, etc.)
- No file storage services configured
- No email services configured
- No analytics services

## Environment Configuration

**Required Environment Variables:**
```
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Database
DATABASE_URL=postgresql://...
```

**Template file:** `.env.example`

**Local override:** `.env.local` (gitignored, local development)

## Request Flow

**Public Routes:**
1. Landing page: `/`
2. Authentication: `/sign-in/*`, `/sign-up/*`
3. Report viewing: `/report/*` (share token based access)

**Protected Routes:**
- All other routes require Clerk authentication
- Middleware intercepts at `src/middleware.ts`

---

*Integration audit: 2026-09-07*
