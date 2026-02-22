import { useState } from 'react'
import { useRemoveFriend } from '@/hooks/useFriends'
import { cn } from '@/lib/utils'
import type { FriendWithProfile } from '@/types'
import toast from 'react-hot-toast'

interface FriendCardProps {
  friend: FriendWithProfile
}

function AvatarCircle({
  avatarUrl,
  username,
  email,
  size = 'md',
}: {
  avatarUrl: string | null
  username: string | null
  email: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase()

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-base',
  }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username ?? email}
        className={cn('rounded-full object-cover', sizeClasses[size])}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-brand-500/20 font-semibold text-brand-400',
        sizeClasses[size]
      )}
    >
      {initials}
    </div>
  )
}

export function FriendCard({ friend }: FriendCardProps) {
  const [confirming, setConfirming] = useState(false)
  const { mutateAsync: removeFriend, isPending } = useRemoveFriend()

  const displayName = friend.username ?? friend.email.split('@')[0]

  const handleRemove = async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    try {
      await removeFriend(friend.friendshipId)
      toast.success(`${displayName} removed from friends.`)
    } catch {
      toast.error('Failed to remove friend. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-surface-border bg-surface-card p-4 transition-colors hover:border-zinc-600">
      {/* Avatar */}
      <AvatarCircle
        avatarUrl={friend.avatarUrl}
        username={friend.username}
        email={friend.email}
        size="md"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-zinc-100">{displayName}</p>
        <p className="truncate text-xs text-zinc-500">{friend.email}</p>
      </div>

      {/* Remove button */}
      <div className="flex items-center gap-2">
        {confirming && (
          <span className="text-xs text-zinc-400">Are you sure?</span>
        )}
        <button
          onClick={handleRemove}
          disabled={isPending}
          onBlur={() => setConfirming(false)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
            confirming
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-surface-elevated text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
          )}
        >
          {isPending ? 'Removing…' : confirming ? 'Confirm' : 'Remove'}
        </button>
      </div>
    </div>
  )
}

// Re-export AvatarCircle for use in other components
export { AvatarCircle }
