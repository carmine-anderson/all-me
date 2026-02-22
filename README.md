# AllMe 🌱

> Your personal productivity dashboard — tasks, focus time, and daily progress in one place.

## Features

- **📊 Productivity Heatmap** — GitHub-style 52-week grid tracking your daily productivity level (1–5)
- **✅ Task Management** — Create, prioritize, and track tasks sorted by due date with overdue alerts
- **⏱ Pomodoro Timer** — Circular focus timer with configurable durations, browser notifications, and session logging
- **💬 Feel-Good Feedback** — Encouraging messages after every check-in, confetti for high-productivity days
- **📱 PWA** — Install directly from the browser, works offline
- **🔒 Secure** — Row-level security on every table; your data is only ever visible to you

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 (dark-first) |
| Routing | React Router v6 |
| State | Zustand + TanStack Query v5 |
| Animations | Framer Motion |
| Backend | Supabase (Auth + Postgres + RLS) |
| ORM | Drizzle ORM (migrations only) |
| PWA | vite-plugin-pwa (Workbox) |
| Dev | Docker + Docker Compose |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- Docker (optional, for containerized dev)

### 1. Clone & install

```bash
git clone https://github.com/your-username/allme.git
cd allme
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

### 3. Set up the database

Run the SQL migration in your Supabase SQL Editor:

```bash
# Option A: Copy-paste src/db/migrations/0001_initial_schema.sql into Supabase SQL Editor

# Option B: Run via Drizzle Kit (requires DATABASE_URL in .env.local)
npm run db:migrate
```

### 4. Start development

```bash
# Local
npm run dev

# Docker
docker-compose up
```

Open [http://localhost:5173](http://localhost:5173)

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Vitest |
| `npm run db:generate` | Generate Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations to Supabase |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |

---

## Docker

```bash
# Development (hot reload)
docker-compose up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

---

## PWA Installation

1. Open the app in Chrome/Edge/Safari
2. Look for the "Install" prompt in the address bar
3. Click Install — the app will appear on your home screen / desktop

---

## Security

- **Row Level Security (RLS)** is enabled on all tables — users can only access their own data
- The Supabase `anon` key is safe to expose in the browser (RLS enforces data isolation)
- `DATABASE_URL` is **never** bundled into the browser app — it's only used by Drizzle Kit CLI
- All forms are validated with Zod schemas client-side, with DB constraints as a second layer
- Production nginx config includes CSP, X-Frame-Options, and other security headers

---

## Project Structure

```
src/
├── components/
│   ├── ui/           # Button, Card, Modal, Badge, Input, Select
│   ├── layout/       # AppShell, Sidebar, TopNav
│   ├── productivity/ # Heatmap, CheckIn, FeedbackMessage
│   ├── tasks/        # TaskList, TaskCard, TaskForm
│   └── pomodoro/     # PomodoroTimer, Controls, Settings
├── db/               # Drizzle schema + migrations
├── hooks/            # useProductivity, useTasks, usePomodoro, useAuth
├── lib/              # supabase client, utils, feedbackMessages
├── pages/            # AuthPage, DashboardPage, TasksPage, SettingsPage
├── providers/        # AuthProvider, QueryProvider, ThemeProvider
├── router/           # React Router config + protected routes
├── store/            # Zustand stores (pomodoro, ui)
├── styles/           # Tailwind globals
└── types/            # Shared TypeScript types
```
