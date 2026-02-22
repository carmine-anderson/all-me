import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import type { FriendWithProfile, SearchedProfile, FriendshipStatus } from '@/types'

const FRIENDS_KEY = 'friends'
const SEARCH_KEY = 'profile-search'

// ─── Map RPC row → FriendWithProfile ─────────────────────────────────────────
function mapFriendRow(row: Record<string, unknown>): FriendWithProfile {
  return {
    friendshipId: row.friendship_id as string,
    friendId: row.friend_id as string,
    username: (row.username as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    email: row.email as string,
    status: row.status as FriendshipStatus,
    requesterId: row.requester_id as string,
    addresseeId: row.addressee_id as string,
    createdAt: row.created_at as string,
  }
}

// ─── useFriends — all friendships (accepted + pending) ───────────────────────
export function useFriends() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [FRIENDS_KEY, user?.id],
    queryFn: async (): Promise<FriendWithProfile[]> => {
      if (!user) return []
      const { data, error } = await supabase.rpc('get_friends_with_email', {
        p_user_id: user.id,
      })
      if (error) throw error
      return ((data as Record<string, unknown>[]) ?? []).map(mapFriendRow)
    },
    enabled: !!user,
  })
}

/** Convenience: only accepted friends */
export function useAcceptedFriends() {
  const { data: all = [], ...rest } = useFriends()
  return { data: all.filter((f) => f.status === 'accepted'), ...rest }
}

/** Convenience: incoming pending requests (I am the addressee) */
export function usePendingRequests() {
  const { user } = useAuth()
  const { data: all = [], ...rest } = useFriends()
  return {
    data: all.filter(
      (f) => f.status === 'pending' && f.addresseeId === user?.id
    ),
    ...rest,
  }
}

/** Convenience: outgoing pending requests (I am the requester) */
export function useOutgoingRequests() {
  const { user } = useAuth()
  const { data: all = [], ...rest } = useFriends()
  return {
    data: all.filter(
      (f) => f.status === 'pending' && f.requesterId === user?.id
    ),
    ...rest,
  }
}

// ─── useSearchUsers — search by exact email via RPC ──────────────────────────
export function useSearchUsers(email: string) {
  return useQuery({
    queryKey: [SEARCH_KEY, email],
    queryFn: async (): Promise<SearchedProfile[]> => {
      if (!email.trim()) return []
      const { data, error } = await supabase.rpc('search_profiles_by_email', {
        search_email: email.trim(),
      })
      if (error) throw error
      return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
        id: row.id as string,
        username: (row.username as string) ?? null,
        avatarUrl: (row.avatar_url as string) ?? null,
        email: row.email as string,
      }))
    },
    enabled: email.trim().length > 0,
    staleTime: 10_000,
  })
}

// ─── useSendFriendRequest ─────────────────────────────────────────────────────
export function useSendFriendRequest() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!user) throw new Error('Not authenticated')

      // 1. Insert friendship
      const { data: friendship, error: fErr } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending',
        })
        .select()
        .single()

      if (fErr) throw fErr

      // 2. Insert notification for the addressee
      const { error: nErr } = await supabase.from('notifications').insert({
        user_id: addresseeId,
        actor_id: user.id,
        type: 'friend_request',
        reference_id: friendship.id,
        read: false,
      })

      if (nErr) throw nErr

      return friendship
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FRIENDS_KEY, user?.id] })
    },
  })
}

// ─── useRespondToFriendRequest ────────────────────────────────────────────────
export function useRespondToFriendRequest() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      friendshipId,
      status,
    }: {
      friendshipId: string
      status: 'accepted' | 'declined'
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('friendships')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', friendshipId)
        .eq('addressee_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FRIENDS_KEY, user?.id] })
    },
  })
}

// ─── useRemoveFriend ──────────────────────────────────────────────────────────
export function useRemoveFriend() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FRIENDS_KEY, user?.id] })
    },
  })
}
