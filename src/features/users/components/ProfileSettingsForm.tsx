'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { userService } from '@/features/users/services/user.service'
import { profileUpdateSchema } from '@/features/users/schemas/user.schema'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'

export function ProfileSettingsForm() {
  const [profile, setProfile] = useState<{
    full_name: string
    phone: string | null
    avatar_url: string | null
  } | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  useEffect(() => {
    userService
      .profile()
      .then(setProfile)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'Unable to load your profile.'),
      )
  }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const parsed = profileUpdateSchema.safeParse({
      full_name: form.get('full_name'),
      phone: form.get('phone') || null,
      avatar_url: form.get('avatar_url') || null,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your profile details.')
      return
    }
    setPending(true)
    setError('')
    setMessage('')
    try {
      setProfile(await userService.updateProfile(parsed.data))
      setMessage('Profile updated.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update your profile.')
    } finally {
      setPending(false)
    }
  }
  if (!profile && !error) return <p>Loading profile…</p>
  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4">
      <FormError message={error} />
      {message && (
        <p role="status" className="text-sm text-emerald-700">
          {message}
        </p>
      )}
      <FormField htmlFor="profile-name" label="Full name">
        <Input
          id="profile-name"
          name="full_name"
          defaultValue={profile?.full_name ?? ''}
          required
        />
      </FormField>
      <FormField htmlFor="profile-phone" label="Phone number">
        <Input id="profile-phone" name="phone" type="tel" defaultValue={profile?.phone ?? ''} />
      </FormField>
      <FormField htmlFor="profile-avatar" label="Avatar URL">
        <Input
          id="profile-avatar"
          name="avatar_url"
          type="url"
          defaultValue={profile?.avatar_url ?? ''}
        />
      </FormField>
      <FormSubmit pending={pending}>Save profile</FormSubmit>
    </form>
  )
}
