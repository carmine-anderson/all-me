// ─────────────────────────────────────────────────────────────────────────────
// Drizzle client — used ONLY for migrations via CLI (drizzle-kit)
// The browser app uses the Supabase JS client directly (src/lib/supabase.ts)
// NEVER import this file in browser/React code
// ─────────────────────────────────────────────────────────────────────────────

// This file is intentionally minimal.
// To run migrations: npm run db:migrate
// To generate migrations: npm run db:generate
// To open Drizzle Studio: npm run db:studio

export * from './schema'
