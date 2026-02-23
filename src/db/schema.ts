import {
  pgTable,
  uuid,
  text,
  smallint,
  date,
  boolean,
  timestamp,
  unique,
  check,
  time,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── profiles ─────────────────────────────────────────────────────────────────
// Extends auth.users — created automatically via trigger on signup
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // references auth.users(id)
  username: text('username'),
  avatarUrl: text('avatar_url'),
  timezone: text('timezone').default('UTC').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── productivity_checkins ────────────────────────────────────────────────────
export const productivityCheckins = pgTable(
  'productivity_checkins',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    checkinDate: date('checkin_date').notNull(),
    level: smallint('level').notNull(), // 1–5
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueUserDate: unique().on(t.userId, t.checkinDate),
    levelCheck: check('level_range', sql`${t.level} BETWEEN 1 AND 5`),
  })
)

// ─── tasks ────────────────────────────────────────────────────────────────────
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  startTime: time('start_time'),                          // HH:MM local time
  endTime: time('end_time'),                              // HH:MM local time
  isRecurring: boolean('is_recurring').default(false).notNull(),
  recurrenceDays: text('recurrence_days').array().default(sql`'{}'`).notNull(),
  recurrenceEndDate: date('recurrence_end_date'),
  recurrenceGroupId: uuid('recurrence_group_id'),         // groups all occurrences of a series
  priority: text('priority').default('medium').notNull(), // low | medium | high
  status: text('status').default('todo').notNull(),       // todo | in_progress | done
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── pomodoro_sessions ────────────────────────────────────────────────────────
export const pomodoroSessions = pgTable('pomodoro_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationMins: smallint('duration_mins').default(25).notNull(),
  sessionType: text('session_type').default('work').notNull(), // work | short_break | long_break
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── friendships ──────────────────────────────────────────────────────────────
export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: text('status').default('pending').notNull(), // pending | accepted | declined
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniquePair: unique().on(t.requesterId, t.addresseeId),
  })
)

// ─── notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // friend_request | task_invite
  referenceId: uuid('reference_id').notNull(), // friendship.id OR task_invite.id
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── task_invites ─────────────────────────────────────────────────────────────
export const taskInvites = pgTable(
  'task_invites',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    inviterId: uuid('inviter_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    inviteeId: uuid('invitee_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: text('status').default('pending').notNull(), // pending | accepted | declined
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueTaskInvitee: unique().on(t.taskId, t.inviteeId),
  })
)

// ─── Type exports (inferred from schema) ─────────────────────────────────────
export type ProfileRow = typeof profiles.$inferSelect
export type ProductivityCheckinRow = typeof productivityCheckins.$inferSelect
export type TaskRow = typeof tasks.$inferSelect
export type PomodoroSessionRow = typeof pomodoroSessions.$inferSelect
export type FriendshipRow = typeof friendships.$inferSelect
export type NotificationRow = typeof notifications.$inferSelect
export type TaskInviteRow = typeof taskInvites.$inferSelect

export type NewTask = typeof tasks.$inferInsert
export type NewCheckin = typeof productivityCheckins.$inferInsert
export type NewPomodoroSession = typeof pomodoroSessions.$inferInsert
export type NewFriendship = typeof friendships.$inferInsert
export type NewNotification = typeof notifications.$inferInsert
export type NewTaskInvite = typeof taskInvites.$inferInsert
