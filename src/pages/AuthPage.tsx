import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type AuthFormValues = z.infer<typeof schema>
type AuthMode = 'login' | 'signup'

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ email, password }: AuthFormValues) => {
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Welcome back! 👋')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Account created! Check your email to confirm. 🎉')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    reset()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-gradient text-4xl font-bold tracking-tight">AllMe</h1>
          <p className="mt-2 text-sm text-zinc-500">Your personal productivity dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl">
          {/* Tab switcher */}
          <div className="mb-6 flex rounded-lg bg-surface-elevated p-1">
            {(['login', 'signup'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all duration-150 ${
                  mode === m
                    ? 'bg-surface-card text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete={mode === 'login' ? 'email' : 'email'}
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Password"
                type="password"
                placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                error={errors.password?.message}
                {...register('password')}
              />

              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </motion.form>
          </AnimatePresence>

          {mode === 'login' && (
            <p className="mt-4 text-center text-xs text-zinc-600">
              Don't have an account?{' '}
              <button
                onClick={() => switchMode('signup')}
                className="text-brand-400 hover:text-brand-300"
              >
                Sign up
              </button>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-700">
          Your data is private and secured with row-level security.
        </p>
      </motion.div>
    </div>
  )
}
