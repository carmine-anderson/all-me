import { useState, useRef } from 'react'
import { useAcceptedFriends } from '@/hooks/useFriends'
import { AvatarCircle } from '@/components/friends/FriendCard'
import { cn } from '@/lib/utils'

interface InviteFriendPickerProps {
  /** Called whenever the selection changes */
  onChange: (selectedIds: string[]) => void
  /** Currently selected friend IDs (controlled) */
  selectedIds: string[]
}

export function InviteFriendPicker({ onChange, selectedIds }: InviteFriendPickerProps) {
  const [open, setOpen] = useState(false)
  const { data: friends = [], isLoading } = useAcceptedFriends()
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleFriend = (friendId: string) => {
    if (selectedIds.includes(friendId)) {
      onChange(selectedIds.filter((id) => id !== friendId))
    } else {
      onChange([...selectedIds, friendId])
    }
  }

  const handleToggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) {
      // Scroll the container into view after the dropdown renders
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 60)
    }
  }

  const selectedCount = selectedIds.length

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {/* Accordion toggle */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className="flex w-full items-center justify-between rounded-xl border border-surface-border bg-surface-elevated px-4 py-3 text-left transition-colors hover:border-zinc-600"
      >
        <div className="flex items-center gap-2">
          {/* People icon */}
          <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-medium text-zinc-300">
            Invite a Friend
          </span>
          {selectedCount > 0 && (
            <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-medium text-brand-400">
              {selectedCount} selected
            </span>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={cn('h-4 w-4 text-zinc-500 transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion content */}
      {open && (
        <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-surface-border border-t-brand-500" />
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center px-4">
              <svg className="h-7 w-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm text-zinc-500">No friends to invite yet.</p>
              <p className="text-xs text-zinc-600">
                Add friends from the Friends page first.
              </p>
            </div>
          ) : (
            /* Scrollable list — shows ~5 rows then scrolls internally */
            <ul className="max-h-[280px] overflow-y-auto divide-y divide-surface-border overscroll-contain">
              {friends.map((friend) => {
                const isSelected = selectedIds.includes(friend.friendId)
                const displayName = friend.username ?? friend.email.split('@')[0]

                return (
                  <li key={friend.friendId}>
                    <button
                      type="button"
                      onClick={() => toggleFriend(friend.friendId)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        isSelected
                          ? 'bg-brand-500/10'
                          : 'hover:bg-surface-elevated'
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          isSelected
                            ? 'border-brand-500 bg-brand-500'
                            : 'border-zinc-600 bg-transparent'
                        )}
                      >
                        {isSelected && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Avatar */}
                      <AvatarCircle
                        avatarUrl={friend.avatarUrl}
                        username={friend.username}
                        email={friend.email}
                        size="sm"
                      />

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-200">{displayName}</p>
                        <p className="truncate text-xs text-zinc-500">{friend.email}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
