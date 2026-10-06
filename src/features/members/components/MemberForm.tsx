'use client'

import { useState, type FormEvent } from 'react'
import { memberService } from '@/features/members/services/member.service'
import { memberCreateSchema } from '@/features/members/schemas/member.schema'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSubmit } from '@/components/forms/FormSubmit'
import { Input } from '@/components/ui/Input'
import type { Member } from '@/types/member'

export function MemberForm({ groupId, onCreated }: { groupId: string; onCreated?: (member: Member) => void }) {
  const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement)
    const result = memberCreateSchema.safeParse({ group_id: groupId, full_name: form.get('full_name'), email: form.get('email') || null, phone: form.get('phone') || null })
    if (!result.success) { setError(result.error.issues[0]?.message ?? 'Check member details.'); return }
    setPending(true); setError('')
    try { const member = await memberService.create(result.data); onCreated?.(member); formElement.reset() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not add member.') }
    finally { setPending(false) }
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><FormError message={error} /><FormField htmlFor="member-name" label="Full name"><Input id="member-name" name="full_name" required /></FormField><FormField htmlFor="member-email" label="Email"><Input id="member-email" name="email" type="email" /></FormField><FormField htmlFor="member-phone" label="Phone"><Input id="member-phone" name="phone" type="tel" /></FormField><p className="self-center text-sm text-slate-600">Role assignments are managed separately from Physio Fund Cycle membership.</p><FormSubmit pending={pending}>Add member</FormSubmit></form>
}
