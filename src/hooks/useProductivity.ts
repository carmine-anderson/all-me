import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'
import { todayString } from '@/lib/utils'
import type { ProductivityCheckin, ProductivityLevel } from '@/types'

const QUERY_KEY = 'productivity_checkins'

export function useProductivityCheckins() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async (): Promise<ProductivityCheckin[]> => {
      if (!user) return []
      const { data, error } = await supabase
        .from('productivity_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('checkin_date', { ascending: false })

      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        checkinDate: row.checkin_date,
        level: row.level as ProductivityLevel,
        note: row.note,
        createdAt: row.created_at,
      }))
    },
    enabled: !!user,
  })
}

export function useTodayCheckin() {
  const { data: checkins } = useProductivityCheckins()
  const today = todayString()
  return checkins?.find((c) => c.checkinDate === today) ?? null
}

export function useUpsertCheckin() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      level,
      note,
    }: {
      level: ProductivityLevel
      note?: string
    }) => {
      if (!user) throw new Error('Not authenticated')
      const today = todayString()

      const { data, error } = await supabase
        .from('productivity_checkins')
        .upsert(
          {
            user_id: user.id,
            checkin_date: today,
            level,
            note: note ?? null,
          },
          { onConflict: 'user_id,checkin_date' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] })
    },
  })
}
