import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AccentColorPicker } from '@/components/ui/AccentColorPicker'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/hooks/useTheme'
import { useProfile, useUpdateProfile, useUploadAvatar } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const profileSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50).optional(),
})

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const [savingPassword, setSavingPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) })

  // Pre-populate username field once profile data loads
  useEffect(() => {
    if (profile) {
      resetProfile({ username: profile.username ?? '' })
    }
  }, [profile, resetProfile])

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) })

  const onSaveProfile = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync({ username: values.username })
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    }
  }

  const onChangePassword = async (values: PasswordFormValues) => {
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: values.newPassword })
      if (error) throw error
      toast.success('Password updated!')
      resetPassword()
    } catch {
      toast.error('Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB')
      return
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)

    try {
      await uploadAvatar.mutateAsync(file)
      toast.success('Profile picture updated!')
    } catch {
      toast.error('Failed to upload profile picture')
      setAvatarPreview(null)
    }
  }

  const currentAvatar = avatarPreview ?? profile?.avatarUrl ?? null
  const initials = (profile?.username ?? user?.email ?? '?')
    .slice(0, 2)
    .toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>

        {/* Avatar upload */}
        <div className="mb-6 flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-brand-500/60 ring-offset-2 ring-offset-surface-card transition-all hover:ring-brand-400"
            title="Click to change profile picture"
          >
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-brand-500/20 text-xl font-bold text-brand-400">
                {initials}
              </span>
            )}
            {/* Hover overlay */}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-xs font-medium text-white">Change</span>
            </span>
          </button>

          <div>
            <p className="text-sm font-medium text-zinc-200">Profile Picture</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              JPG, PNG, WebP or GIF · Max 5 MB
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
              disabled={uploadAvatar.isPending}
            >
              {uploadAvatar.isPending ? 'Uploading…' : 'Upload new picture'}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onAvatarFileChange}
          />
        </div>

        <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-400">Email</p>
            <p className="text-sm text-zinc-300">{user?.email}</p>
          </div>
          <Input
            label="Username"
            placeholder="Your display name"
            error={profileErrors.username?.message}
            {...registerProfile('username')}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" loading={updateProfile.isPending}>
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <div className="space-y-6">
          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Theme</p>
              <p className="text-xs text-zinc-500">
                Currently using {theme === 'dark' ? 'dark' : 'light'} mode
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
            </Button>
          </div>

          {/* Accent color */}
          <div>
            <p className="mb-3 text-sm font-medium text-zinc-200">Accent Color</p>
            <AccentColorPicker />
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={passwordErrors.newPassword?.message}
            {...registerPassword('newPassword')}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Repeat your new password"
            autoComplete="new-password"
            error={passwordErrors.confirmPassword?.message}
            {...registerPassword('confirmPassword')}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" loading={savingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-200">Sign out</p>
            <p className="text-xs text-zinc-500">Sign out of your account on this device</p>
          </div>
          <Button variant="danger" size="sm" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
