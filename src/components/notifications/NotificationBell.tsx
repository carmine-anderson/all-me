import { useRef, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useUIStore } from '@/store/uiStore'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from '@/hooks/useNotifications'
import { useRespondToFriendRequest } from '@/hooks/useFriends'
import { useRespondToTaskInvite } from '@/hooks/useTaskInvites'
import { cn } from '@/lib/utils'
import type { NotificationWithActor } from '@/types'
import toast from 'react-hot-toast'

// ─── Avatar initials helper ───────────────────────────────────────────────────
function getInitials(username: string | null, email: string): string {
  if (username) return username.slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

// ─── Single notification item ─────────────────────────────────────────────────
function NotificationItem({ notification }: { notification: NotificationWithActor }) {
  const { mutateAsync: markRead } = useMarkNotificationRead()
  const { mutateAsync: deleteNotification, isPending: deletePending } = useDeleteNotification()
  const { mutateAsync: respondFriend, isPending: friendPending } = useRespondToFriendRequest()
  const { mutateAsync: respondTask, isPending: taskPending } = useRespondToTaskInvite()

  const handleMarkRead = async () => {
    if (!notification.read) {
      await markRead(notification.id)
    }
  }

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteNotification(notification.id)
    } catch {
      toast.error('Failed to dismiss notification.')
    }
  }

  const handleFriendResponse = async (status: 'accepted' | 'declined') => {
    try {
      await respondFriend({ friendshipId: notification.referenceId, status })
      await markRead(notification.id)
      toast.success(status === 'accepted' ? 'Friend request accepted!' : 'Friend request declined.')
    } catch {
      toast.error('Failed to respond. Please try again.')
    }
  }

  const handleTaskResponse = async (status: 'accepted' | 'declined') => {
    try {
      await respondTask({ taskInviteId: notification.referenceId, status })
      await markRead(notification.id)
      toast.success(status === 'accepted' ? 'Task added to your list!' : 'Task invite declined.')
    } catch {
      toast.error('Failed to respond. Please try again.')
    }
  }

  const initials = getInitials(notification.actorUsername, notification.actorEmail)
  const displayName = notification.actorUsername ?? notification.actorEmail.split('@')[0]
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-2 rounded-lg p-3 transition-colors',
        notification.read
          ? 'bg-transparent hover:bg-surface-elevated/40'
          : 'bg-brand-500/5 border border-brand-500/10'
      )}
      onClick={handleMarkRead}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        disabled={deletePending}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-zinc-600 opacity-0 transition-all hover:bg-zinc-700 hover:text-zinc-300 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Actor info + time */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-400">
          {initials}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm text-zinc-200 leading-snug">
            {notification.type === 'friend_request' ? (
              <>
                <span className="font-medium">{displayName}</span>
                <span className="text-zinc-400"> sent you a friend request</span>
              </>
            ) : (
              <>
                <span className="font-medium">{displayName}</span>
                <span className="text-zinc-400"> invited you to a task</span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{timeAgo}</p>
        </div>

        {/* Unread dot */}
        {!notification.read && (
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
        )}
      </div>

      {/* Action buttons — only shown for unread notifications */}
      {!notification.read && notification.type === 'friend_request' && (
        <div className="flex gap-2 pl-11">
          <button
            onClick={(e) => { e.stopPropagation(); handleFriendResponse('accepted') }}
            disabled={friendPending}
            className="flex-1 rounded-md bg-brand-500/20 px-3 py-1.5 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-500/30 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleFriendResponse('declined') }}
            disabled={friendPending}
            className="flex-1 rounded-md bg-surface-elevated px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {!notification.read && notification.type === 'task_invite' && (
        <div className="flex gap-2 pl-11">
          <button
            onClick={(e) => { e.stopPropagation(); handleTaskResponse('accepted') }}
            disabled={taskPending}
            className="flex-1 rounded-md bg-brand-500/20 px-3 py-1.5 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-500/30 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleTaskResponse('declined') }}
            disabled={taskPending}
            className="flex-1 rounded-md bg-surface-elevated px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  )
}

// ─── NotificationBell ─────────────────────────────────────────────────────────
export function NotificationBell() {
  const { notificationPanelOpen, toggleNotificationPanel, setNotificationPanelOpen } = useUIStore()
  const { data: notifications = [], isLoading } = useNotifications()
  const { mutateAsync: markAllRead } = useMarkAllNotificationsRead()
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close on outside click
  useEffect(() => {
    if (!notificationPanelOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotificationPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notificationPanelOpen, setNotificationPanelOpen])

  const handleMarkAllRead = async () => {
    try {
      await markAllRead()
    } catch {
      toast.error('Failed to mark all as read.')
    }
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={toggleNotificationPanel}
        className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
        aria-label="Notifications"
      >
        {/* Bell icon */}
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {notificationPanelOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-surface-border bg-surface-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-100">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-brand-500/20 px-2 py-0.5 text-xs text-brand-400">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-surface-border border-t-brand-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm text-zinc-500">No notifications yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
