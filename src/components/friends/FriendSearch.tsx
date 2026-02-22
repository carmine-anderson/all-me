import { useState, useEffect, useRef } from 'react'
import { useSearchUsers, useSendFriendRequest, useFriends } from '@/hooks/useFriends'
import { useAuth } from '@/providers/AuthProvider'
import { AvatarCircle } from '@/components/friends/FriendCard'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export function FriendSearch() {
  const { user } = useAuth()
  const [inputValue, setInputValue] = useState('')
  const [debouncedEmail, setDebouncedEmail] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: searchResults = [], isFetching } = useSearchUsers(debouncedEmail)
  const { data: existingFriends = [] } = useFriends()
  const { mutateAsync: sendRequest, isPending: isSending } = useSendFriendRequest()

  // Debounce input → only search after 400ms of no typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedEmail(inputValue.trim())
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue])

  const handleSendRequest = async (addresseeId: string, displayName: string) => {
    try {
      await sendRequest(addresseeId)
      toast.success(`Friend request sent to ${displayName}!`)
      setInputValue('')
      setDebouncedEmail('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('You already sent a request to this user.')
      } else {
        toast.error('Failed to send friend request. Please try again.')
      }
    }
  }

  // Determine relationship status for a searched profile
  const getRelationshipStatus = (profileId: string) => {
    if (profileId === user?.id) return 'self'
    const existing = existingFriends.find(
      (f) => f.friendId === profileId
    )
    if (!existing) return 'none'
    return existing.status // 'pending' | 'accepted' | 'declined'
  }

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const showResults = debouncedEmail.length > 0 && isValidEmail(debouncedEmail)

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search by email address…"
          className="w-full rounded-xl border border-surface-border bg-surface-elevated py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        {isFetching && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface-border border-t-brand-500" />
          </div>
        )}
      </div>

      {/* Results */}
      {showResults && (
        <div className="flex flex-col gap-2">
          {searchResults.length === 0 && !isFetching ? (
            <div className="rounded-xl border border-surface-border bg-surface-card p-4 text-center">
              <p className="text-sm text-zinc-500">No user found with that email address.</p>
            </div>
          ) : (
            searchResults.map((profile) => {
              const status = getRelationshipStatus(profile.id)
              const displayName = profile.username ?? profile.email.split('@')[0]

              return (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-card p-3"
                >
                  <AvatarCircle
                    avatarUrl={profile.avatarUrl}
                    username={profile.username}
                    email={profile.email}
                    size="sm"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{displayName}</p>
                    <p className="truncate text-xs text-zinc-500">{profile.email}</p>
                  </div>

                  {/* Action button based on relationship status */}
                  {status === 'self' && (
                    <span className="text-xs text-zinc-500">That's you</span>
                  )}
                  {status === 'accepted' && (
                    <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-400">
                      Friends
                    </span>
                  )}
                  {status === 'pending' && (
                    <span className="rounded-full bg-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400">
                      Pending
                    </span>
                  )}
                  {(status === 'none' || status === 'declined') && (
                    <button
                      onClick={() => handleSendRequest(profile.id, displayName)}
                      disabled={isSending}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg bg-brand-500/20 px-3 py-1.5 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-500/30 disabled:opacity-50'
                      )}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {isSending ? 'Sending…' : 'Add Friend'}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Hint text when input is non-empty but not a valid email yet */}
      {inputValue.length > 0 && !isValidEmail(inputValue) && (
        <p className="text-xs text-zinc-600">Enter a complete email address to search.</p>
      )}
    </div>
  )
}
