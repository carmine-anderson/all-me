# AllMe — Full Stack Application Plan

## Overview

**AllMe** is a personal productivity dashboard built as a React SPA with Tailwind CSS for styling, Supabase (Postgres) as the backend, Drizzle ORM for type-safe queries, Docker + Docker Compose for containerized development, and PWA support for browser-installable distribution.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 + custom design tokens |
| Routing | React Router v6 |
| State | Zustand (lightweight global state) |
| Data fetching | TanStack Query v5 (React Query) |
| ORM | Drizzle ORM (TypeScript-first, Postgres) |
| Backend | Supabase (Auth + Postgres + RLS) |
| PWA | Vite PWA plugin (Workbox) |
| Containerization | Docker + Docker Compose |
| Linting/Formatting | ESLint + Prettier |
| Testing | Vitest + React Testing Library |

---

## Project File Structure

```
allme/
├── plans/
│   └── allme-plan.md
├── public/
│   ├── icons/                    # PWA icons (192x192, 512x512, maskable)
│   └── screenshots/              # PWA install screenshots
├── src/
│   ├── assets/                   # Static assets (fonts, images)
│   ├── components/
│   │   ├── ui/                   # Reusable primitives (Button, Card, Modal, Badge)
│   │   ├── layout/               # AppShell, Sidebar, TopNav
│   │   ├── dashboard/            # DashboardGrid, WelcomeBanner
│   │   ├── productivity/
│   │   │   ├── ProductivityHeatmap.tsx
│   │   │   ├── ProductivityCheckin.tsx
│   │   │   └── FeedbackMessage.tsx
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── TaskFilters.tsx
│   │   └── pomodoro/
│   │       ├── PomodoroTimer.tsx
│   │       ├── PomodoroControls.tsx
│   │       └── PomodoroSettings.tsx
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema definitions
│   │   ├── index.ts              # Drizzle client init
│   │   └── migrations/           # Drizzle migration files
│   ├── hooks/
│   │   ├── useProductivity.ts
│   │   ├── useTasks.ts
│   │   ├── usePomodoro.ts
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client init
│   │   ├── drizzle.ts            # Drizzle + Supabase Postgres connection
│   │   ├── feedbackMessages.ts   # Feel-good message bank
│   │   └── utils.ts              # Shared utilities
│   ├── pages/
│   │   ├── AuthPage.tsx          # Login / Sign up
│   │   ├── DashboardPage.tsx     # Main dashboard
│   │   ├── TasksPage.tsx         # Full task management view
│   │   └── SettingsPage.tsx      # User preferences
│   ├── providers/
│   │   ├── AuthProvider.tsx      # Supabase auth context
│   │   ├── QueryProvider.tsx     # TanStack Query client
│   │   └── ThemeProvider.tsx     # Dark/light mode
│   ├── router/
│   │   └── index.tsx             # React Router config + protected routes
│   ├── store/
│   │   ├── pomodoroStore.ts      # Zustand store for timer state
│   │   └── uiStore.ts            # Zustand store for UI state
│   ├── styles/
│   │   └── globals.css           # Tailwind directives + CSS variables
│   ├── types/
│   │   └── index.ts              # Shared TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example                  # Template for env vars
├── .env.local                    # Local secrets (gitignored)
├── .eslintrc.cjs
├── .prettierrc
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.dev
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## Supabase Database Schema

### Tables

#### `profiles`
Extends Supabase `auth.users`. Created automatically via trigger on user signup.

```sql
id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
username    text
avatar_url  text
timezone    text DEFAULT 'UTC'
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

#### `productivity_checkins`
One entry per user per day.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
checkin_date    date NOT NULL
level           smallint NOT NULL CHECK (level BETWEEN 1 AND 5)
note            text
created_at      timestamptz DEFAULT now()
UNIQUE (user_id, checkin_date)
```

**Level scale:**
- 1 = Very unproductive (lightest green / gray-green)
- 2 = Low productivity
- 3 = Moderate
- 4 = High productivity
- 5 = Extremely productive (darkest green)

#### `tasks`

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
title         text NOT NULL
description   text
due_date      date
priority      text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium'
status        text CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo'
completed_at  timestamptz
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

#### `pomodoro_sessions`
Tracks completed pomodoro sessions for stats.

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
task_id       uuid REFERENCES tasks(id) ON DELETE SET NULL
started_at    timestamptz NOT NULL
ended_at      timestamptz
duration_mins smallint DEFAULT 25
session_type  text CHECK (session_type IN ('work', 'short_break', 'long_break')) DEFAULT 'work'
completed     boolean DEFAULT false
created_at    timestamptz DEFAULT now()
```

### Row Level Security (RLS) Policies

Every table will have RLS **enabled**. Policies follow the pattern:

```sql
-- Example for tasks table
CREATE POLICY "Users can only see their own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id);
```

This ensures users can **never** access another user's data, even if they craft a direct API call.

### Database Triggers

- `handle_new_user` trigger on `auth.users` INSERT → creates a row in `profiles`
- `update_updated_at` trigger on `tasks` and `profiles` UPDATE → sets `updated_at = now()`

---

## Drizzle ORM Setup

Drizzle connects directly to the Supabase Postgres connection string (not the REST API). This gives us full SQL power with type safety.

### Connection (`src/lib/drizzle.ts`)

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

const client = postgres(import.meta.env.VITE_DATABASE_URL)
export const db = drizzle(client, { schema })
```

> **Note:** For a browser-based SPA, Drizzle queries run server-side or via Supabase Edge Functions. For this app, we will use the **Supabase JS client** for all browser-side data fetching (with RLS enforced), and Drizzle for **migrations only** (run from CLI/Docker). This is the correct and secure pattern.

### Schema (`src/db/schema.ts`)

```typescript
import { pgTable, uuid, text, smallint, date, boolean, timestamp, unique } from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', { ... })
export const productivityCheckins = pgTable('productivity_checkins', { ... }, (t) => ({
  uniqueUserDate: unique().on(t.userId, t.checkinDate)
}))
export const tasks = pgTable('tasks', { ... })
export const pomodoroSessions = pgTable('pomodoro_sessions', { ... })
```

### Migration Commands

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Push migrations to Supabase Postgres
npx drizzle-kit migrate
```

---

## React SPA Architecture

### Routing (`src/router/index.tsx`)

```
/               → redirect to /dashboard if authed, else /auth
/auth           → AuthPage (login + signup tabs)
/dashboard      → DashboardPage (protected)
/tasks          → TasksPage (protected)
/settings       → SettingsPage (protected)
```

Protected routes check `AuthProvider` context. Unauthenticated users are redirected to `/auth`.

### State Management

| State | Tool | Reason |
|---|---|---|
| Server data (tasks, checkins) | TanStack Query | Caching, background refetch, optimistic updates |
| Timer state (pomodoro) | Zustand | Needs to persist across route changes |
| UI state (modals, sidebar) | Zustand | Simple, no server sync needed |
| Auth state | Supabase Auth + Context | Single source of truth |

---

## Feature Designs

### 1. Productivity Heatmap (GitHub-style)

**Component:** [`ProductivityHeatmap.tsx`](src/components/productivity/ProductivityHeatmap.tsx)

- Renders a 52-week × 7-day grid of squares
- Each square maps to a `productivity_checkins` row
- Color scale using Tailwind custom colors:

```
level 0 (no entry) → bg-zinc-800 (dark) / bg-zinc-100 (light)
level 1 → bg-emerald-200
level 2 → bg-emerald-400
level 3 → bg-emerald-500
level 4 → bg-emerald-600
level 5 → bg-emerald-800
```

- Hovering a square shows a tooltip: date + level label + note
- Clicking today's square opens the check-in modal
- Animated entrance: squares fade in with staggered delay using Framer Motion

### 2. Productivity Check-in

**Component:** [`ProductivityCheckin.tsx`](src/components/productivity/ProductivityCheckin.tsx)

- Modal or slide-over panel
- 5 emoji/icon buttons representing levels 1–5
- Optional text note field
- On submit → upsert to `productivity_checkins`
- Triggers [`FeedbackMessage.tsx`](src/components/productivity/FeedbackMessage.tsx)

### 3. Feel-Good Feedback System

**File:** [`src/lib/feedbackMessages.ts`](src/lib/feedbackMessages.ts)

A bank of messages keyed by productivity level:

```typescript
export const feedbackMessages = {
  1: [
    "Hey, you showed up. That's everything. Tomorrow is a fresh start 🌱",
    "Even the slowest days move you forward. Rest up, champ 💪",
  ],
  2: [...],
  3: [...],
  4: [...],
  5: [
    "You absolutely crushed it today! 🔥 Keep that energy!",
    "Top tier day. You should be proud of yourself 🏆",
  ],
}
```

- Message is randomly selected from the level's array
- Displayed in a full-screen confetti/celebration overlay for levels 4–5
- Displayed in a warm, encouraging toast/card for levels 1–3
- Uses Framer Motion for smooth entrance animation

### 4. Task Management

**Components:** [`TaskList.tsx`](src/components/tasks/TaskList.tsx), [`TaskCard.tsx`](src/components/tasks/TaskCard.tsx), [`TaskForm.tsx`](src/components/tasks/TaskForm.tsx)

- Tasks sorted by `due_date` ASC by default (overdue tasks highlighted in red)
- Filter by: status (todo / in_progress / done), priority (low / medium / high)
- Task card shows: title, due date, priority badge, status toggle
- Add/edit task via slide-over form panel
- Optimistic updates via TanStack Query mutations
- Overdue tasks get a pulsing red border indicator
- Completing a task triggers a small celebration animation

### 5. Pomodoro Timer

**Components:** [`PomodoroTimer.tsx`](src/components/pomodoro/PomodoroTimer.tsx), [`PomodoroControls.tsx`](src/components/pomodoro/PomodoroControls.tsx)

- Default: 25 min work / 5 min short break / 15 min long break
- Configurable via [`PomodoroSettings.tsx`](src/components/pomodoro/PomodoroSettings.tsx)
- State persisted in Zustand (survives route navigation)
- Browser notification when timer ends (Web Notifications API, permission requested on first use)
- Optional: link a task to the current pomodoro session
- Completed sessions logged to `pomodoro_sessions` table
- Circular SVG progress ring with smooth animation
- Sound effect on completion (optional, user toggle)

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  TopNav: Logo | Nav links | User avatar + menu          │
├──────────────┬──────────────────────────────────────────┤
│              │  Welcome Banner: "Good morning, [name]"  │
│   Sidebar    ├──────────────────────────────────────────┤
│   (collaps-  │  [Productivity Heatmap — full width]     │
│   ible)      ├───────────────────┬─────────────────────┤
│              │  Task Summary     │  Pomodoro Timer     │
│  - Dashboard │  (next 3 due)     │  (compact widget)   │
│  - Tasks     ├───────────────────┴─────────────────────┤
│  - Settings  │  Today's Check-in CTA (if not done yet) │
│              └──────────────────────────────────────────┘
```

---

## PWA Configuration

**Plugin:** `vite-plugin-pwa` (Workbox under the hood)

### `manifest.webmanifest`

```json
{
  "name": "AllMe",
  "short_name": "AllMe",
  "description": "Your personal productivity dashboard",
  "theme_color": "#10b981",
  "background_color": "#09090b",
  "display": "standalone",
  "orientation": "portrait-primary",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker Strategy

- **Shell caching:** App shell (HTML, JS, CSS) cached on install
- **Network-first for API calls:** Supabase requests always go to network; fallback to cache if offline
- **Offline page:** Friendly "You're offline" page shown when network unavailable

---

## Docker + Docker Compose

### `Dockerfile.dev` (development)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

### `Dockerfile` (production build)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `docker-compose.yml`

```yaml
version: '3.9'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    env_file:
      - .env.local
    environment:
      - NODE_ENV=development
```

> Supabase is hosted (cloud), so no local Supabase container is needed. The app container connects to your Supabase project via env vars.

---

## Security Hardening

### Authentication
- Supabase Auth with email/password + optional magic link
- JWT tokens stored in `localStorage` (Supabase default) — acceptable for SPA
- Session refresh handled automatically by Supabase JS client
- Auth state checked on every protected route render

### Row Level Security (RLS)
- **All tables have RLS enabled** — no exceptions
- Every policy uses `auth.uid() = user_id` to scope data to the authenticated user
- Even if someone obtains the `anon` key, they cannot read other users' data

### Environment Variables
- `VITE_SUPABASE_URL` — public, safe to expose
- `VITE_SUPABASE_ANON_KEY` — public anon key, safe to expose (RLS protects data)
- `DATABASE_URL` — **never exposed to browser**, used only for Drizzle migrations from CLI/Docker
- `.env.local` is gitignored

### Content Security Policy (CSP)
- Configured in `nginx.conf` for production
- Restricts `script-src`, `connect-src` to known origins (app domain + Supabase URL)

### Input Validation
- All form inputs validated client-side with **Zod** schemas
- Supabase DB constraints provide server-side validation as a second layer

### Rate Limiting
- Supabase Auth has built-in rate limiting on auth endpoints
- Supabase API has rate limiting on the free/pro tier

---

## Tailwind Design System

### Theme Colors (`tailwind.config.ts`)

```typescript
colors: {
  brand: {
    50:  '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',  // primary emerald
    600: '#059669',
    900: '#064e3b',
  },
  surface: {
    DEFAULT: '#09090b',  // zinc-950 dark bg
    card:    '#18181b',  // zinc-900 card bg
    border:  '#27272a',  // zinc-800 borders
  }
}
```

### Typography
- Font: **Inter** (Google Fonts, self-hosted for offline PWA support)
- Headings: `font-semibold` to `font-bold`
- Body: `font-normal`, `text-zinc-300` on dark bg

### Motion
- **Framer Motion** for page transitions, modal animations, heatmap entrance, celebration effects
- Respect `prefers-reduced-motion` media query — disable animations if user has it set

### Dark Mode
- Default: **dark mode** (the app is dark-first)
- Optional light mode toggle stored in `localStorage` + Tailwind `darkMode: 'class'`

---

## Key Dependencies (`package.json`)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "@supabase/supabase-js": "^2.43.0",
    "drizzle-orm": "^0.30.0",
    "postgres": "^3.4.0",
    "@tanstack/react-query": "^5.28.0",
    "zustand": "^4.5.0",
    "framer-motion": "^11.0.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.51.0",
    "@hookform/resolvers": "^3.3.0",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite-plugin-pwa": "^0.19.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "typescript": "^5.4.0",
    "drizzle-kit": "^0.20.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "vitest": "^1.4.0",
    "@testing-library/react": "^15.0.0"
  }
}
```

---

## Supabase Setup Checklist (Manual Steps)

These steps must be done in the Supabase dashboard before running the app:

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy **Project URL** and **anon public key** → paste into `.env.local`
3. Copy **Database connection string** (Session mode, port 5432) → paste as `DATABASE_URL` in `.env.local`
4. Enable **Email Auth** in Authentication → Providers
5. Run Drizzle migrations: `npx drizzle-kit migrate` (from inside Docker or locally)
6. Verify RLS is enabled on all tables in the Supabase Table Editor

---

## Environment Variables (`.env.example`)

```bash
# Supabase (safe to expose in browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Postgres direct connection (NEVER expose to browser — migrations only)
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# App
VITE_APP_NAME=AllMe
VITE_APP_URL=http://localhost:5173
```

---

## Architecture Diagram

```mermaid
graph TD
    User[User Browser / PWA] -->|HTTPS| Vite[React SPA - Vite]
    Vite -->|Supabase JS Client| SupaAuth[Supabase Auth]
    Vite -->|Supabase JS Client + RLS| SupaDB[Supabase Postgres]
    Docker[Docker Dev Container] -->|Hot reload| Vite
    DrizzleCLI[Drizzle Kit CLI] -->|Direct Postgres| SupaDB
    SupaAuth -->|JWT| Vite
    SupaDB -->|Row data| Vite

    subgraph Frontend
        Vite
        Router[React Router]
        Query[TanStack Query]
        Zustand[Zustand Store]
        Framer[Framer Motion]
    end

    subgraph Backend - Supabase Cloud
        SupaAuth
        SupaDB
        RLS[Row Level Security]
    end

    subgraph Dev Environment
        Docker
        DrizzleCLI
    end
```

---

## Implementation Order (for Code Mode)

1. **Scaffold** — `npm create vite@latest`, install all deps, configure Tailwind, ESLint, Prettier
2. **Docker** — Write `Dockerfile.dev`, `docker-compose.yml`, `nginx.conf`, `Dockerfile`
3. **Supabase + Drizzle** — Write schema, generate + run migrations, set up RLS policies
4. **Auth** — `AuthProvider`, login/signup page, protected route wrapper
5. **Layout** — `AppShell`, `Sidebar`, `TopNav`
6. **Productivity Heatmap** — Data fetching hook + heatmap grid component
7. **Productivity Check-in** — Modal + level selector + feel-good feedback system
8. **Task Management** — CRUD hooks + `TaskList` + `TaskCard` + `TaskForm`
9. **Pomodoro Timer** — Zustand store + timer logic + UI + notifications
10. **Dashboard Assembly** — Compose all widgets into `DashboardPage`
11. **PWA** — Configure `vite-plugin-pwa`, add icons, test install prompt
12. **Polish** — Animations, transitions, responsive layout, accessibility
13. **Settings Page** — User profile, timer preferences, theme toggle
