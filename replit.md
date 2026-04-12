# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## One Step Coaching Platform

Mobile-first LMS for exam preparation built with React/Vite, connecting directly to Supabase (no Express backend needed for this artifact).

### Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage) — no API server used
- **Auth**: Supabase Auth with email/password, email verification, admin approval workflow
- **Storage**: Supabase Storage bucket `coaching-assets` for PDFs and avatars

### Color Theme (SRS)
- Primary Green: `#2E7D32` (HSL 125 47% 33%)
- Secondary Blue: `#1976D2` (HSL 211 73% 46%)
- Accent Amber: `#FFC107` (HSL 45 100% 58%)
- Danger Red: `#D32F2F` (HSL 4 67% 50%)
- Background: `#F5F7FA` (HSL 214 32% 97%)
- Font: Segoe UI, sans-serif

### User Roles
- **Student**: Browse content, take tests, view analytics
- **Teacher**: Manage content (subjects/chapters/topics), create tests, view student analytics
- **Admin**: All teacher permissions + user management (approve/reject/role change)

### Content Hierarchy
Subject → Chapter → Topic → Content (text/PDF/video)

### Supabase Setup (Required)
1. Run `supabase-schema.sql` in Supabase SQL Editor to create all tables, RLS policies, triggers, helper functions, and the storage bucket
2. After the schema is installed, the first registered user is automatically assigned `role='Admin'` and `status='approved'`
3. Later Student/Teacher registrations remain pending until approved in the Admin page

### Environment Variables
- `SUPABASE_URL` — Supabase project URL (secret)
- `SUPABASE_ANON_KEY` — Supabase anonymous key (secret)
- Vite config maps these to `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` via `define`

### Database Security Notes
- RLS policies use security-definer helper functions to avoid recursive `users` table policy checks.
- Regular users can update profile fields but cannot self-promote role/status.
- Admins can approve/reject users and manage all content/test records.
- The `coaching-assets` bucket is public so PDFs and avatars generated through `getPublicUrl()` open correctly from the app.

### Key Files
- `supabase-schema.sql` — Complete database schema
- `artifacts/one-step-coaching/src/lib/supabase.ts` — Supabase client
- `artifacts/one-step-coaching/src/lib/auth-context.tsx` — Auth provider with role/status checks
- `artifacts/one-step-coaching/src/lib/types.ts` — TypeScript types
- `artifacts/one-step-coaching/src/App.tsx` — Routes and protected route guards
- `artifacts/one-step-coaching/src/pages/` — All page components

### Pages
- `/login`, `/register` — Auth pages
- `/dashboard` — Role-based dashboard with stats
- `/content` — Hierarchical content browser
- `/tests` — Test listing, creation (Teacher/Admin), test-taking with timer
- `/analytics` — Charts (recharts) for performance tracking
- `/admin` — User management (Admin only)
- `/profile` — Profile settings (name, password, avatar)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
