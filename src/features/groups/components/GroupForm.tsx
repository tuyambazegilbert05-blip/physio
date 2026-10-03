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
import type { Group } from '@/types/group'

export function GroupForm({ onCreated }: { onCreated?: (group: Group) => void }) {
  const router = useRouter()
  const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement)
    const parsed = groupCreateSchema.safeParse({ name: form.get('name'), contribution_amount: Number(form.get('contribution_amount')), contribution_frequency: form.get('contribution_frequency'), currency: form.get('currency') })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check group details.'); return }
    setPending(true); setError('')
    try {
      const group = await groupService.create(parsed.data)
      onCreated?.(group)
      formElement.reset()
      if (!onCreated) {
        router.replace(`/dashboard?group=${encodeURIComponent(group.id)}`)
        router.refresh()
      }
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the group.') }
    finally { setPending(false) }
  }
  return <form onSubmit={submit} className="grid gap-4"><FormError message={error} /><FormField htmlFor="group-name" label="Group name"><Input id="group-name" name="name" required /></FormField><FormField htmlFor="group-currency" label="Currency"><Input id="group-currency" name="currency" defaultValue="RWF" minLength={3} maxLength={3} required /></FormField><FormField htmlFor="group-contribution" label="Regular contribution"><Input id="group-contribution" name="contribution_amount" type="number" min="1" step="1" required /></FormField><FormField htmlFor="group-frequency" label="Contribution frequency"><Select id="group-frequency" name="contribution_frequency"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="quarterly">Quarterly</option></Select></FormField><FormSubmit pending={pending}>Create group</FormSubmit></form>
}
