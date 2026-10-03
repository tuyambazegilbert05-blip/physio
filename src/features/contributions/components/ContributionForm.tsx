'use client'

import { useState, type FormEvent } from 'react'
import { contributionService } from '@/features/contributions/services/contribution.service'
import { contributionCreateSchema } from '@/features/contributions/schemas/contribution.schema'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Contribution } from '@/types/contribution'

export function ContributionForm({ groupId, members, onCreated }: { groupId: string; members: { id: string; name: string }[]; onCreated?: (item: Contribution) => void }) {
  const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement)
    const parsed = contributionCreateSchema.safeParse({ group_id: groupId, member_id: form.get('member_id'), amount: Number(form.get('amount')), contribution_type: form.get('contribution_type'), period: form.get('period'), reference: form.get('reference') || null })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check contribution details.'); return }
    setPending(true); setError('')
    try { const item = await contributionService.create(parsed.data); onCreated?.(item); formElement.reset() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not record contribution.') }
    finally { setPending(false) }
  }
  return <form onSubmit={submit} className="grid gap-4"><FormError message={error} /><FormField htmlFor="contribution-member" label="Member"><Select id="contribution-member" name="member_id" required><option value="">Choose a member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</Select></FormField><FormField htmlFor="contribution-amount" label="Amount (RWF)"><Input id="contribution-amount" name="amount" type="number" min="1" step="1" required /></FormField><FormField htmlFor="contribution-type" label="Contribution type"><Select id="contribution-type" name="contribution_type"><option value="regular">Regular</option><option value="social">Social</option><option value="special">Special</option></Select></FormField><FormField htmlFor="contribution-period" label="Period"><Input id="contribution-period" name="period" type="date" required /></FormField><FormField htmlFor="contribution-reference" label="Payment reference"><Input id="contribution-reference" name="reference" /></FormField><FormSubmit pending={pending}>Record contribution</FormSubmit></form>
}
