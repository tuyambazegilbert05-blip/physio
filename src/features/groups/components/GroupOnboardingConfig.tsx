'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { apiRequest } from '@/lib/api'

type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'phone' | 'select' | 'radio' | 'checkbox'
type FieldDraft = {
  id?: string
  key: string
  label: string
  description: string
  field_type: FieldType
  is_required: boolean
  options: string[]
  is_active: boolean
  display_order: number
}
type Config = {
  terms: { id: string; version: number; title: string; body: string; is_required: boolean } | null
  fields: (Omit<FieldDraft, 'key' | 'id' | 'options'> & { id: string; options: string[] })[]
}

const newField = (order: number): FieldDraft => ({
  key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  label: '',
  description: '',
  field_type: 'text',
  is_required: false,
  options: [],
  is_active: true,
  display_order: order,
})

export function GroupOnboardingConfig({ groupId }: { groupId: string }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [fields, setFields] = useState<FieldDraft[]>([])
  const [termsTitle, setTermsTitle] = useState('')
  const [termsBody, setTermsBody] = useState('')
  const [termsRequired, setTermsRequired] = useState(true)
  const [loadedGroupId, setLoadedGroupId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    apiRequest<Config>(`/api/groups/onboarding-config?group_id=${encodeURIComponent(groupId)}`)
      .then((next) => {
        if (!active) return
        setConfig(next)
        setTermsTitle(next.terms?.title ?? '')
        setTermsBody(next.terms?.body ?? '')
        setTermsRequired(next.terms?.is_required ?? true)
        setFields(next.fields.map((field) => ({ ...field, key: field.id })))
        setLoadedGroupId(groupId)
        setError('')
      })
      .catch((cause: unknown) => {
        if (active) {
          setLoadedGroupId(groupId)
          setError(cause instanceof Error ? cause.message : 'Onboarding settings could not be loaded.')
        }
      })
    return () => { active = false }
  }, [groupId])

  function updateField(key: string, update: Partial<FieldDraft>) {
    setFields((current) => current.map((field) => field.key === key ? { ...field, ...update } : field))
  }

  async function save() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await apiRequest<{ terms_changed: boolean; fields_changed: boolean }>('/api/groups/onboarding-config', {
        method: 'PUT',
        body: JSON.stringify({
          group_id: groupId,
          terms_title: termsTitle,
          terms_body: termsBody,
          terms_required: termsRequired,
          fields: fields.map((field) => ({
            ...(field.id ? { id: field.id } : {}),
            label: field.label,
            description: field.description,
            type: field.field_type,
            required: field.is_required,
            active: field.is_active,
            order: field.display_order,
            options: ['select', 'radio'].includes(field.field_type) ? field.options : [],
          })),
        }),
      })
      setNotice(saved.terms_changed || saved.fields_changed
        ? 'Settings saved. Members will review the updated requirements or information fields in their Member onboarding.'
        : 'Group onboarding settings saved.')
      const next = await apiRequest<Config>(`/api/groups/onboarding-config?group_id=${encodeURIComponent(groupId)}`)
      setConfig(next)
      setTermsTitle(next.terms?.title ?? '')
      setTermsBody(next.terms?.body ?? '')
      setTermsRequired(next.terms?.is_required ?? true)
      setFields(next.fields.map((field) => ({ ...field, key: field.id })))
      setLoadedGroupId(groupId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Onboarding settings could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const loading = loadedGroupId !== groupId

  return (
    <section className="space-y-5 rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_18px_46px_-38px_rgba(36,55,245,0.45)] sm:p-7">
      <div>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-violet-700">Member setup</p>
        <h2 className="mt-1 font-heading text-lg font-extrabold text-[#081233]">Group onboarding</h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Set the current membership requirements and the extra information new members should provide. Requirements are versioned so members can review changes.</p>
      </div>
      {error && <FormError message={error} />}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">{notice}</p>}
      {loading ? <p role="status" className="text-sm text-slate-500">Loading member setup…</p> : (
        <>
          <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Rules and requirements</h3>
              <p className="mt-1 text-[11px] text-slate-500">Saving changed text creates a new version for members to review.</p>
            </div>
            <FormField htmlFor="membership-terms-title" label="Title">
              <Input id="membership-terms-title" value={termsTitle} onChange={(event) => setTermsTitle(event.target.value)} maxLength={160} placeholder="Membership rules" />
            </FormField>
            <FormField htmlFor="membership-terms-body" label="Requirements and terms" hint="Leave both title and text blank to remove the current requirements. Previous versions remain in history.">
              <Textarea id="membership-terms-body" value={termsBody} onChange={(event) => setTermsBody(event.target.value)} rows={5} maxLength={12000} placeholder="Explain the rules and requirements members should understand before joining…" />
            </FormField>
            {termsBody.trim() && <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={termsRequired} onChange={(event) => setTermsRequired(event.target.checked)} className="mt-0.5 accent-violet-600" />Members must explicitly accept these rules.</label>}
            {config?.terms && <p className="text-[10px] font-semibold text-slate-500">Current version: {config.terms.version}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-sm font-bold text-slate-800">Additional member information</h3><p className="mt-1 text-[11px] text-slate-500">Answers are attached to each member’s membership record.</p></div>
              <button type="button" onClick={() => setFields((current) => [...current, newField(current.length)])} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-bold text-violet-800 hover:bg-violet-50"><Plus className="h-3.5 w-3.5" />Add field</button>
            </div>
            {fields.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">No additional information is required from members.</p>}
            {fields.map((field, index) => (
              <article key={field.key} className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-2 ${field.is_active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                <FormField htmlFor={`member-field-label-${field.key}`} label="Field label"><Input id={`member-field-label-${field.key}`} value={field.label} onChange={(event) => updateField(field.key, { label: event.target.value })} placeholder="For example, occupation" /></FormField>
                <FormField htmlFor={`member-field-type-${field.key}`} label="Answer type"><Select id={`member-field-type-${field.key}`} value={field.field_type} onChange={(event) => updateField(field.key, { field_type: event.target.value as FieldType, options: [] })}><option value="text">Short text</option><option value="textarea">Long text</option><option value="number">Number</option><option value="date">Date</option><option value="phone">Phone</option><option value="select">Select list</option><option value="radio">Single choice</option><option value="checkbox">Confirmation checkbox</option></Select></FormField>
                <FormField htmlFor={`member-field-description-${field.key}`} label="Help text"><Input id={`member-field-description-${field.key}`} value={field.description} onChange={(event) => updateField(field.key, { description: event.target.value })} maxLength={500} placeholder="Optional explanation" /></FormField>
                {['select', 'radio'].includes(field.field_type) && <FormField htmlFor={`member-field-options-${field.key}`} label="Choices" hint="Enter one choice per line."><Textarea id={`member-field-options-${field.key}`} rows={3} value={field.options.join('\n')} onChange={(event) => updateField(field.key, { options: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })} /></FormField>}
                <div className="flex items-center justify-between gap-3 sm:col-span-2">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={field.is_required} onChange={(event) => updateField(field.key, { is_required: event.target.checked })} className="accent-violet-600" />Required</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={field.is_active} onChange={(event) => updateField(field.key, { is_active: event.target.checked })} className="accent-violet-600" />Active</label>
                    <span className="text-[10px] text-slate-400">Field {index + 1}</span>
                  </div>
                  <button type="button" onClick={() => updateField(field.key, { is_active: false })} aria-label={`Deactivate ${field.label || 'member field'}`} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            ))}
          </div>
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save member onboarding'}</button>
        </>
      )}
    </section>
  )
}
