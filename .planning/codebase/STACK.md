# Technology Stack

**Analysis Date:** 2026-09-07

## Languages

**Primary:**

- TypeScript 5.9.2 - Full-stack type safety

**Secondary:**

- CSS (via Tailwind CSS 4) - Utility-first styling

## Runtime

**Environment:**

- Node.js (via Next.js)
- Platform: Next.js 15 App Router

**Package Manager:**

- npm (standard Next.js setup)

## Frameworks

**Core:**

- Next.js 15.5.2 - React 19 full-stack framework with App Router
- React 19.1.1 - UI library

**Authentication:**

- Clerk 6.31.8 - `@clerk/nextjs` for authentication and user management

**Database:**

- Prisma ORM 6.15.0 - Type-safe database queries
- PostgreSQL - Database provider (configured in `prisma/schema.prisma`)

**UI:**

- Tailwind CSS 4.1.12 - Utility-first CSS framework
- Lucide React 0.542.0 - Icon library
- clsx 2.1.1 - Conditional className utility

## Key Dependencies

**Calendar/Scheduling:**

- react-big-calendar 1.20.0 - Calendar component
- @types/react-big-calendar 1.16.3 - TypeScript types
- moment 2.30.1 - Date manipulation (legacy, used with react-big-calendar)

**Date Handling:**

- date-fns 4.4.0 - Modern date utility library

**Validation:**

- zod 4.1.5 - Schema validation

## Development Tooling

**Type Checking:**

- TypeScript 5.9.2
- @types/node 24.3.0
- @types/react 19.1.12
- @types/react-dom 19.1.9

**Linting & Formatting:**

- ESLint 9.34.0
- eslint-config-next 15.5.2
- @tailwindcss/postcss 4.1.12 (PostCSS plugin for Tailwind)

**Build:**

- Next.js build pipeline
- Prisma generate (run as part of `npm run build`)

## Configuration

**TypeScript:**

- Config: `tsconfig.json`
- Path alias: `@/*` maps to `./src/*`
- Strict mode enabled
- Target: ES2017

**PostCSS:**

- Plugin: `@tailwindcss/postcss`
- Config: `postcss.config.mjs`

**Next.js:**

- Config: `next.config.ts`
- Minimal configuration (default settings)

## Project Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production (runs prisma generate first)
npm run start      # Start production server
npm run lint       # Run ESLint
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run database migrations
npm run prisma:studio      # Open Prisma Studio
```

---

_Stack analysis: 2026-09-07_
