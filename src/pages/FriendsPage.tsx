import { useAcceptedFriends, usePendingRequests, useRespondToFriendRequest } from '@/hooks/useFriends'
import { FriendCard, AvatarCircle } from '@/components/friends/FriendCard'
import { FriendSearch } from '@/components/friends/FriendSearch'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

// ─── Pending request row ──────────────────────────────────────────────────────
function PendingRequestRow({ friend }: { friend: ReturnType<typeof usePendingRequests>['data'][number] }) {
  const { mutateAsync: respond, isPending } = useRespondToFriendRequest()
  const displayName = friend.username ?? friend.email.split('@')[0]
  const timeAgo = formatDistanceToNow(new Date(friend.createdAt), { addSuffix: true })

  const handleRespond = async (status: 'accepted' | 'declined') => {
    try {
      await respond({ friendshipId: friend.friendshipId, status })
      toast.success(
        status === 'accepted'
          ? `You and ${displayName} are now friends!`
          : `Request from ${displayName} declined.`
      )
    } catch {
      toast.error('Failed to respond. Please try again.')
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-surface-border bg-surface-card p-4">
      <AvatarCircle
        avatarUrl={friend.avatarUrl}
        username={friend.username}
        email={friend.email}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-zinc-100">{displayName}</p>
        <p className="truncate text-xs text-zinc-500">{friend.email}</p>
        <p className="mt-0.5 text-xs text-zinc-600">{timeAgo}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleRespond('accepted')}
          disabled={isPending}
          className="rounded-lg bg-brand-500/20 px-3 py-1.5 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-500/30 disabled:opacity-50"
        >
          Accept
        </button>
        <button
          onClick={() => handleRespond('declined')}
          disabled={isPending}
          className="rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </div>
  )
}

// ─── FriendsPage ──────────────────────────────────────────────────────────────
export function FriendsPage() {
  const { data: friends = [], isLoading: friendsLoading } = useAcceptedFriends()
  const { data: pendingRequests = [], isLoading: pendingLoading } = usePendingRequests()

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Friends</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect with others, share tasks, and collaborate.
        </p>
      </div>

      {/* ── Add a Friend ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Add a Friend
        </h2>
        <FriendSearch />
      </section>

      {/* ── Pending Requests ─────────────────────────────────────────────────── */}
      {(pendingRequests.length > 0 || pendingLoading) && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-medium text-brand-400">
                {pendingRequests.length}
              </span>
            )}
          </h2>

          {pendingLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-surface-border border-t-brand-500" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingRequests.map((req) => (
                <PendingRequestRow key={req.friendshipId} friend={req} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── My Friends ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          My Friends
          {friends.length > 0 && (
            <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-medium text-zinc-400">
              {friends.length}
            </span>
          )}
        </h2>

        {friendsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-surface-border border-t-brand-500" />
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-surface-border py-12 text-center">
            {/* People icon */}
            <svg className="h-10 w-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-zinc-400">No friends yet</p>
              <p className="mt-1 text-xs text-zinc-600">
                Search for someone by email above to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {friends.map((friend) => (
              <FriendCard key={friend.friendshipId} friend={friend} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
