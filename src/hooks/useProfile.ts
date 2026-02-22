import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

export interface Profile {
  id: string
  username: string | null
  avatarUrl: string | null
  timezone: string
}

const QUERY_KEY = 'profile'
const AVATAR_BUCKET = 'avatars'

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, timezone')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return {
        id: data.id,
        username: data.username ?? null,
        avatarUrl: data.avatar_url ?? null,
        timezone: data.timezone,
      }
    },
    enabled: !!user,
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: { username?: string }) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('profiles')
        .update({ username: values.username ?? null, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] })
    },
  })
}

export function useUploadAvatar() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error('Not authenticated')

      // Derive extension and build a stable path per user
      const ext = file.name.split('.').pop() ?? 'jpg'
      const filePath = `${user.id}/avatar.${ext}`

      // Upload (upsert) to the avatars bucket
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      // Persist the URL in the profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (dbError) throw dbError

      return publicUrl
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] })
    },
  })
}
