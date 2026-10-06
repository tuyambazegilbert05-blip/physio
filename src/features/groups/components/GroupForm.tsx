'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { groupService } from '@/features/groups/services/group.service'
import { groupCreateSchema } from '@/features/groups/schemas/group.schema'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { persistActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import type { Group } from '@/types/group'

export function GroupForm({ onCreated }: { onCreated?: (group: Group) => void }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const parsed = groupCreateSchema.safeParse({
      name: form.get('name'),
      contribution_amount: Number(form.get('contribution_amount')),
      contribution_frequency: form.get('contribution_frequency'),
      currency: form.get('currency'),
      description: form.get('description'),
      location: form.get('location'),
      discoverable: form.get('discoverable') === 'on',
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check group details.')
      return
    }
    setPending(true)
    setError('')
    try {
      const group = await groupService.create(parsed.data)
      persistActiveGroup(group.id)
      onCreated?.(group)
      formElement.reset()
      router.replace(`/dashboard?group=${encodeURIComponent(group.id)}`)
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create the group.')
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <FormError message={error} />
      <FormField htmlFor="group-name" label="Group name">
        <Input id="group-name" name="name" required />
      </FormField>
      <FormField
        htmlFor="group-description"
        label="Description"
        hint="Optional public details that help people identify your Ikimina."
      >
        <textarea
          id="group-description"
          name="description"
          maxLength={2000}
          rows={3}
          className="w-full rounded-xl border border-indigo-100 bg-white/90 px-3.5 py-2.5 text-sm font-medium text-[#081233] outline-none focus:border-[#7B3FF2]/50 focus:ring-4 focus:ring-[#7B3FF2]/10"
        />
      </FormField>
      <FormField htmlFor="group-location" label="Community or location">
        <Input id="group-location" name="location" maxLength={160} />
      </FormField>
      <label
        htmlFor="group-discoverable"
        className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-600"
      >
        <input
          id="group-discoverable"
          name="discoverable"
          type="checkbox"
          defaultChecked
          className="mt-0.5 accent-violet-600"
        />
        Show this group in the verified account group finder. Only public group details are
        displayed.
      </label>
      <FormField htmlFor="group-currency" label="Currency">
        <Input
          id="group-currency"
          name="currency"
          defaultValue="RWF"
          minLength={3}
          maxLength={3}
          required
        />
      </FormField>
      <FormField htmlFor="group-contribution" label="Regular contribution">
        <Input
          id="group-contribution"
          name="contribution_amount"
          type="number"
          min="1"
          step="1"
          required
        />
      </FormField>
      <FormField htmlFor="group-frequency" label="Contribution frequency">
        <Select id="group-frequency" name="contribution_frequency">
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="quarterly">Quarterly</option>
        </Select>
      </FormField>
      <FormSubmit pending={pending}>Create group</FormSubmit>
    </form>
  )
}
