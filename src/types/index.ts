// ─── Database row types (mirrors Drizzle schema) ─────────────────────────────

export interface Profile {
  id: string
  username: string | null
  avatarUrl: string | null
  timezone: string
  createdAt: string
  updatedAt: string
}

export type ProductivityLevel = 1 | 2 | 3 | 4 | 5

export interface ProductivityCheckin {
  id: string
  userId: string
  checkinDate: string // ISO date string YYYY-MM-DD
  level: ProductivityLevel
  note: string | null
  createdAt: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  userId: string
  title: string
  description: string | null
  dueDate: string | null // ISO date string YYYY-MM-DD
  priority: TaskPriority
  status: TaskStatus
  completedAt: string | null
  createdAt: string
  updatedAt: string
  // Shared task metadata (populated when task comes from a task_invite)
  isShared?: boolean
  inviterName?: string | null
  inviterEmail?: string | null
  taskInviteId?: string | null
}

export type PomodoroSessionType = 'work' | 'short_break' | 'long_break'

export interface PomodoroSession {
  id: string
  userId: string
  taskId: string | null
  startedAt: string
  endedAt: string | null
  durationMins: number
  sessionType: PomodoroSessionType
  completed: boolean
  createdAt: string
}

// ─── Friend & Social types ────────────────────────────────────────────────────

export type FriendshipStatus = 'pending' | 'accepted' | 'declined'

export interface Friendship {
  id: string
  requesterId: string
  addresseeId: string
  status: FriendshipStatus
  createdAt: string
  updatedAt: string
}

/** Enriched friend profile returned by the get_friends_with_email RPC */
export interface FriendWithProfile {
  friendshipId: string
  friendId: string
  username: string | null
  avatarUrl: string | null
  email: string
  status: FriendshipStatus
  requesterId: string
  addresseeId: string
  createdAt: string
}

/** Minimal profile returned by search_profiles_by_email RPC */
export interface SearchedProfile {
  id: string
  username: string | null
  avatarUrl: string | null
  email: string
}

// ─── Notification types ───────────────────────────────────────────────────────

export type NotificationType = 'friend_request' | 'task_invite'

export interface Notification {
  id: string
  userId: string
  actorId: string
  type: NotificationType
  referenceId: string // friendship.id OR task_invite.id
  read: boolean
  createdAt: string
}

/** Enriched notification with actor profile info, returned by get_notifications_with_actor RPC */
export interface NotificationWithActor extends Notification {
  actorUsername: string | null
  actorAvatar: string | null
  actorEmail: string
}

// ─── Task Invite types ────────────────────────────────────────────────────────

export type TaskInviteStatus = 'pending' | 'accepted' | 'declined'

export interface TaskInvite {
  id: string
  taskId: string
  inviterId: string
  inviteeId: string
  status: TaskInviteStatus
  createdAt: string
  updatedAt: string
}

/** Enriched task invite with invitee profile info, returned by get_task_invites_with_invitee RPC */
export interface TaskInviteWithInvitee extends TaskInvite {
  inviteeUsername: string | null
  inviteeAvatar: string | null
  inviteeEmail: string
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface TaskFormValues {
  title: string
  description?: string
  dueDate?: string
  priority: TaskPriority
  status: TaskStatus
  invitedFriendIds?: string[]
}

export interface CheckinFormValues {
  level: ProductivityLevel
  note?: string
}

// ─── UI types ─────────────────────────────────────────────────────────────────

export interface HeatmapDay {
  date: string // YYYY-MM-DD
  level: ProductivityLevel | 0 // 0 = no entry
  note: string | null
}

export type Theme = 'dark' | 'light'

export type AccentColor = 'green' | 'red' | 'orange' | 'yellow' | 'pink' | 'purple' | 'blue'

export interface PomodoroSettings {
  workDuration: number      // minutes
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number // sessions before long break
  autoStartBreaks: boolean
  autoStartWork: boolean
  soundEnabled: boolean
}

export type PomodoroPhase = 'work' | 'short_break' | 'long_break'
export type PomodoroStatus = 'idle' | 'running' | 'paused' | 'finished'
