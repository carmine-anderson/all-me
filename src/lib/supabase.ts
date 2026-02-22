import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
      'Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ─── Typed database helpers ───────────────────────────────────────────────────

/** Get the currently authenticated user's ID, throws if not authenticated */
export async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return user.id
}
