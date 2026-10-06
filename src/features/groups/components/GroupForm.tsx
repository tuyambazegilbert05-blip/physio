'use client'

import { useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Coins,
  Globe,
  Info,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { groupService, type CreatedGroupResponse } from '@/features/groups/services/group.service'
import { FormError } from '@/components/forms/FormError'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { persistActiveGroup } from '@/features/dashboard/hooks/useActiveGroup'
import type { Group } from '@/types/group'
import type { MemberFieldInput } from '@/features/groups/schemas/group.schema'

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6

const STEP_LABELS = [
  { step: 1, label: 'Identity', icon: Users },
  { step: 2, label: 'Visibility', icon: Globe },
  { step: 3, label: 'Financials', icon: Coins },
  { step: 4, label: 'Constitution', icon: BookOpen },
  { step: 5, label: 'Review', icon: CheckCircle2 },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-RW').format(amount) + ' RWF'
}

function calculateTwoYearEndDate(startDateStr: string): string {
  if (!startDateStr) return ''
  const date = new Date(startDateStr)
  if (Number.isNaN(date.getTime())) return ''
  date.setFullYear(date.getFullYear() + 2)
  return date.toISOString().split('T')[0]
}

export function GroupForm({ onCreated }: { onCreated?: (group: Group) => void }) {
  const router = useRouter()
  const formUid = useId()

  // Step 1: Basic Information
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')

  // Step 2: Community & Visibility
  const [discoverable, setDiscoverable] = useState(true)

  // Step 3: Operational Cycle & Financial Configuration
  const [cycleName, setCycleName] = useState('Cycle 1')
  const [cycleStartDate, setCycleStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [shareUnitPrice, setShareUnitPrice] = useState(25000)
  const [socialContribution, setSocialContribution] = useState(5000)
  const [dueDay, setDueDay] = useState(1)
  const [loanMax, setLoanMax] = useState(2000000)
  const [rateUpTo4Months, setRateUpTo4Months] = useState(3)
  const [rateOver4Months, setRateOver4Months] = useState(5)

  // Step 4: Rules & Requirements
  const [rulesTitle, setRulesTitle] = useState('Group Rules & Constitution')
  const [rulesBody, setRulesBody] = useState(
    `1. Monthly Share Savings: Every active member commits to purchasing their agreed share quantity every month before the due day.\n` +
      `2. Social Fund: A fixed social contribution of 5,000 RWF is paid monthly by every member into the separate emergency assistance fund.\n` +
      `3. Loan Policy: Mutual credit is granted up to the cycle limit subject to committee review. Interest rates: 3% (up to 4 months) or 5% (longer terms). Max 1 active loan per member.\n` +
      `4. Transparency & Attendance: All members participate in group assemblies and have full visibility over verified financial records.\n` +
      `5. Governance: Overseen by the elected Chairperson, Committee, and designated administrators in accordance with the bylaws.`,
  )
  const [memberFields, setMemberFields] = useState<MemberFieldInput[]>([
    {
      label: 'National ID / Passport Number',
      description: 'Official identity document number for verification',
      field_type: 'text',
      is_required: true,
      options: [],
      display_order: 1,
    },
    {
      label: 'Mobile Money Phone Number',
      description: 'Primary phone for contributions and disbursements',
      field_type: 'phone',
      is_required: true,
      options: [],
      display_order: 2,
    },
    {
      label: 'Emergency Contact Person & Phone',
      description: 'Next of kin or authorized referee',
      field_type: 'text',
      is_required: false,
      options: [],
      display_order: 3,
    },
  ])

  // Custom onboarding field builder
  const [customFieldLabel, setCustomFieldLabel] = useState('')
  const [customFieldType, setCustomFieldType] = useState<'text' | 'phone' | 'number' | 'date'>(
    'text',
  )
  const [customFieldRequired, setCustomFieldRequired] = useState(false)
  const [showCustomAdder, setShowCustomAdder] = useState(false)

  // Wizard State
  const [step, setStep] = useState<WizardStep>(1)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [createdGroup, setCreatedGroup] = useState<CreatedGroupResponse | null>(null)

  const cycleEndDate = useMemo(() => calculateTwoYearEndDate(cycleStartDate), [cycleStartDate])

  function handleAddCustomField() {
    const trimmed = customFieldLabel.trim()
    if (!trimmed) return
    setMemberFields((prev) => [
      ...prev,
      {
        label: trimmed,
        description: '',
        field_type: customFieldType,
        is_required: customFieldRequired,
        options: [],
        display_order: prev.length + 1,
      },
    ])
    setCustomFieldLabel('')
    setShowCustomAdder(false)
  }

  function handleRemoveField(index: number) {
    setMemberFields((prev) => prev.filter((_, i) => i !== index))
  }

  function validateStep(currentStep: WizardStep): boolean {
    setError('')
    if (currentStep === 1) {
      const cleanName = name.trim()
      if (cleanName.length < 2) {
        setError('Group name must be at least 2 characters long.')
        return false
      }
      if (cleanName.length > 120) {
        setError('Group name cannot exceed 120 characters.')
        return false
      }
    }

    if (currentStep === 3) {
      if (!cycleStartDate) {
        setError('Please select a cycle start date.')
        return false
      }
      if (shareUnitPrice <= 0) {
        setError('Share price must be greater than zero.')
        return false
      }
      if (socialContribution < 0) {
        setError('Social contribution cannot be negative.')
        return false
      }
      if (loanMax <= 0) {
        setError('Maximum loan limit must be greater than zero.')
        return false
      }
      if (
        rateUpTo4Months < 0 ||
        rateUpTo4Months > 100 ||
        rateOver4Months < 0 ||
        rateOver4Months > 100
      ) {
        setError('Interest rates must be between 0% and 100%.')
        return false
      }
      if (dueDay < 1 || dueDay > 28) {
        setError('Contribution due day must be between 1 and 28.')
        return false
      }
    }

    if (currentStep === 4) {
      if (rulesBody.trim().length < 10) {
        setError('Please provide constitution and rules text (at least 10 characters).')
        return false
      }
    }

    return true
  }

  function goToNextStep() {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5) as WizardStep)
    }
  }

  function goToPreviousStep() {
    setError('')
    setStep((prev) => Math.max(prev - 1, 1) as WizardStep)
  }

  async function handleFinalSubmit() {
    if (!validateStep(1) || !validateStep(3) || !validateStep(4)) {
      return
    }

    setPending(true)
    setError('')

    try {
      const response = await groupService.create({
        name: name.trim(),
        description: description.trim(),
        location: location.trim() || null,
        discoverable,
        currency: 'RWF',
        cycle_name: cycleName.trim() || 'Cycle 1',
        cycle_start_date: cycleStartDate,
        share_unit_price: Number(shareUnitPrice),
        social_contribution: Number(socialContribution),
        loan_max: Number(loanMax),
        rate_up_to_4_months: Number(rateUpTo4Months),
        rate_over_4_months: Number(rateOver4Months),
        due_day: Number(dueDay),
        contribution_frequency: 'monthly',
        rules_title: rulesTitle.trim() || 'Group Rules & Constitution',
        rules_body: rulesBody.trim(),
        member_fields: memberFields,
      })

      setCreatedGroup(response)
      persistActiveGroup(response.id)
      onCreated?.(response)
      setStep(6)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initialize group. Please try again.')
    } finally {
      setPending(false)
    }
  }

  // Step 6: Success & Workspace Entry
  if (step === 6 && createdGroup) {
    return (
      <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/70 to-white p-6 md:p-8 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Group Initialized Successfully
          </span>
          <h2 className="mt-2 font-heading text-2xl font-black text-[#103024]">
            {createdGroup.name}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Your Ikimina group and first operational cycle are officially open and ready.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Operational Cycle
            </span>
            <p className="mt-1 text-sm font-extrabold text-[#081233]">
              {createdGroup.initialization?.cycle_name ?? 'Cycle 1'} (2 Years)
            </p>
            <p className="text-xs text-slate-500">
              {createdGroup.initialization?.starts_on ?? cycleStartDate} to{' '}
              {createdGroup.initialization?.ends_on ?? cycleEndDate}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Your Active Roles
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                Founding Member
              </span>
              <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">
                Chairperson
              </span>
              <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
                Committee Member
              </span>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                System Administrator
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-900 leading-relaxed">
          <p className="font-bold flex items-center gap-1.5">
            <Info className="h-4 w-4 shrink-0 text-amber-600" /> Security & Separation of Duties
          </p>
          <p className="mt-1">
            Privileged roles such as <strong>Treasurer</strong> and <strong>Secretary</strong> were
            not automatically granted to the creator. You may appoint and ratify them with your
            committee inside the management center.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              router.replace(`/dashboard?group=${encodeURIComponent(createdGroup.id)}`)
              router.refresh()
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#7B3FF2]/20 hover:opacity-95 transition"
          >
            Enter Group Workspace <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-indigo-100/80 bg-white/90 p-5 md:p-6 shadow-sm">
      {/* Wizard Progress Stepper */}
      <nav aria-label="Group creation progress" className="mb-6">
        <ol className="flex items-center justify-between gap-1.5 border-b border-indigo-50 pb-4">
          {STEP_LABELS.map((item) => {
            const Icon = item.icon
            const isActive = step === item.step
            const isCompleted = step > item.step

            return (
              <li key={item.step} className="flex flex-1 items-center gap-1.5">
                <button
                  type="button"
                  disabled={item.step > step}
                  onClick={() => {
                    if (item.step < step) {
                      setError('')
                      setStep(item.step as WizardStep)
                    }
                  }}
                  className={`group flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-bold transition ${
                    isActive
                      ? 'bg-[#7B3FF2]/10 text-[#5934bd]'
                      : isCompleted
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${
                      isActive
                        ? 'bg-[#7B3FF2] text-white shadow-sm shadow-[#7B3FF2]/30'
                        : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
                {item.step < 5 && (
                  <div
                    className={`h-0.5 flex-1 transition ${
                      isCompleted ? 'bg-emerald-400' : 'bg-slate-100'
                    }`}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <FormError message={error} />

      <AnimatePresence mode="wait">
        {/* STEP 1: BASIC INFORMATION */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4.5"
          >
            <div>
              <h3 className="font-heading text-base font-extrabold text-[#231044]">
                1. Basic Information
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Establish the public identity for your Ikimina group.
              </p>
            </div>

            <div className="grid gap-2">
              <label htmlFor={`${formUid}-name`} className="text-xs font-bold text-[#18234A]">
                Group name <span className="text-rose-500">*</span>
              </label>
              <Input
                id={`${formUid}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Abadasigana Savings Cooperative"
                maxLength={120}
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-500">
                Choose the name members will use to identify your Ikimina.
              </p>
            </div>

            <div className="grid gap-2">
              <label
                htmlFor={`${formUid}-description`}
                className="text-xs font-bold text-[#18234A]"
              >
                Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <Textarea
                id={`${formUid}-description`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Briefly describe the vision or objective of this group..."
              />
              <p className="text-[11px] text-slate-500">
                Optional public details that help people identify your group.
              </p>
            </div>

            <div className="grid gap-2">
              <label htmlFor={`${formUid}-location`} className="text-xs font-bold text-[#18234A]">
                Community or location <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <Input
                id={`${formUid}-location`}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={160}
                placeholder="e.g. Kigali, Gasabo, Workplace Cooperative, Nyamirambo"
              />
              <p className="text-[11px] text-slate-500">
                Help people identify where your group operates or which community it serves.
              </p>
            </div>
          </motion.div>
        )}

        {/* STEP 2: COMMUNITY & VISIBILITY */}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4.5"
          >
            <div>
              <h3 className="font-heading text-base font-extrabold text-[#231044]">
                2. Community & Visibility
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Configure discovery preferences and operational currency.
              </p>
            </div>

            <div className="grid gap-3">
              <span className="text-xs font-bold text-[#18234A]">Group Visibility</span>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDiscoverable(true)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                    discoverable
                      ? 'border-[#7B3FF2] bg-[#7B3FF2]/5 ring-2 ring-[#7B3FF2]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      discoverable ? 'bg-[#7B3FF2] text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-[#081233]">Discoverable</span>
                      {discoverable && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.2 text-[10px] font-bold text-violet-700">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Show in the verified account group finder. Only public name and location are
                      displayed; member lists and financials remain completely private.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDiscoverable(false)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                    !discoverable
                      ? 'border-[#7B3FF2] bg-[#7B3FF2]/5 ring-2 ring-[#7B3FF2]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      !discoverable ? 'bg-[#7B3FF2] text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-[#081233]">Private</span>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Hidden from group finder. Members can only join via direct invitation or
                      authorized admission links.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#18234A]">Operating Currency</span>
                  <p className="text-[11px] text-slate-500">
                    All accounts, shares, and loans are denominated in Rwandan Francs.
                  </p>
                </div>
                <span className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-extrabold text-[#081233] shadow-xs">
                  Rwandan Franc (RWF)
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: FINANCIAL & CYCLE CONFIGURATION */}
        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4.5"
          >
            <div>
              <h3 className="font-heading text-base font-extrabold text-[#231044]">
                3. Financial & Operational Cycle
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Establish the 2-year operational cycle, share values, and loan parameters.
              </p>
            </div>

            {/* Cycle Parameters */}
            <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#7B3FF2]" />
                <span className="text-xs font-extrabold text-[#231044]">
                  First Operational Cycle (2-Year Duration)
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label
                    htmlFor={`${formUid}-cycle-name`}
                    className="text-xs font-bold text-[#18234A]"
                  >
                    Cycle name
                  </label>
                  <Input
                    id={`${formUid}-cycle-name`}
                    value={cycleName}
                    onChange={(e) => setCycleName(e.target.value)}
                    placeholder="Cycle 1"
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <label
                    htmlFor={`${formUid}-cycle-start`}
                    className="text-xs font-bold text-[#18234A]"
                  >
                    Cycle start date
                  </label>
                  <Input
                    id={`${formUid}-cycle-start`}
                    type="date"
                    value={cycleStartDate}
                    onChange={(e) => setCycleStartDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 border border-violet-100">
                <span>Calculated cycle closing date:</span>
                <span className="font-extrabold text-[#231044]">{cycleEndDate || '—'}</span>
              </div>
            </div>

            {/* Share & Social Fund Configuration */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label
                  htmlFor={`${formUid}-share-price`}
                  className="text-xs font-bold text-[#18234A]"
                >
                  Share price (RWF) <span className="text-rose-500">*</span>
                </label>
                <Input
                  id={`${formUid}-share-price`}
                  type="number"
                  min="1"
                  step="1000"
                  value={shareUnitPrice}
                  onChange={(e) => setShareUnitPrice(Number(e.target.value))}
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Value of 1 share. Members save according to their registered share quantity.
                </p>
              </div>

              <div className="grid gap-1.5">
                <label
                  htmlFor={`${formUid}-social-contrib`}
                  className="text-xs font-bold text-[#18234A]"
                >
                  Social contribution (RWF / mo)
                </label>
                <Input
                  id={`${formUid}-social-contrib`}
                  type="number"
                  min="0"
                  step="500"
                  value={socialContribution}
                  onChange={(e) => setSocialContribution(Number(e.target.value))}
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Fixed monthly emergency assistance fund kept separate from savings.
                </p>
              </div>
            </div>

            {/* Contribution Frequency & Due Day */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label
                  htmlFor={`${formUid}-frequency`}
                  className="text-xs font-bold text-[#18234A]"
                >
                  Obligation frequency
                </label>
                <div
                  id={`${formUid}-frequency`}
                  className="flex h-10 items-center justify-between rounded-xl border border-indigo-100 bg-slate-50 px-3.5 text-sm font-bold text-[#081233]"
                >
                  <span>Monthly</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Fixed standard
                  </span>
                </div>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor={`${formUid}-due-day`} className="text-xs font-bold text-[#18234A]">
                  Monthly payment due day (1 - 28)
                </label>
                <Input
                  id={`${formUid}-due-day`}
                  type="number"
                  min="1"
                  max="28"
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Loan Policies */}
            <div className="rounded-2xl border border-indigo-100 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#7B3FF2]" />
                <span className="text-xs font-extrabold text-[#18234A]">
                  Mutual Credit & Loan Policies
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1">
                  <label
                    htmlFor={`${formUid}-loan-max`}
                    className="text-[11px] font-bold text-slate-600"
                  >
                    Max loan limit (RWF)
                  </label>
                  <Input
                    id={`${formUid}-loan-max`}
                    type="number"
                    min="10000"
                    step="50000"
                    value={loanMax}
                    onChange={(e) => setLoanMax(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="grid gap-1">
                  <label
                    htmlFor={`${formUid}-rate-short`}
                    className="text-[11px] font-bold text-slate-600"
                  >
                    Rate ≤ 4 Months (%)
                  </label>
                  <Input
                    id={`${formUid}-rate-short`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={rateUpTo4Months}
                    onChange={(e) => setRateUpTo4Months(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="grid gap-1">
                  <label
                    htmlFor={`${formUid}-rate-long`}
                    className="text-[11px] font-bold text-slate-600"
                  >
                    Rate &gt; 4 Months (%)
                  </label>
                  <Input
                    id={`${formUid}-rate-long`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={rateOver4Months}
                    onChange={(e) => setRateOver4Months(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <p className="mt-2 text-[11px] text-slate-500">
                Members are restricted to a maximum of 1 active loan simultaneously until settled.
              </p>
            </div>
          </motion.div>
        )}

        {/* STEP 4: RULES & REQUIREMENTS */}
        {step === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4.5"
          >
            <div>
              <h3 className="font-heading text-base font-extrabold text-[#231044]">
                4. Rules & Member Requirements
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Define the group constitution and required membership onboarding information.
              </p>
            </div>

            {/* Constitution / Bylaws */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`${formUid}-rules-body`}
                  className="text-xs font-bold text-[#18234A]"
                >
                  Group Rules & Constitution <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Members must accept upon joining</span>
              </div>
              <Input
                value={rulesTitle}
                onChange={(e) => setRulesTitle(e.target.value)}
                placeholder="Constitution Title"
                className="mb-1"
              />
              <Textarea
                id={`${formUid}-rules-body`}
                value={rulesBody}
                onChange={(e) => setRulesBody(e.target.value)}
                rows={6}
                required
              />
            </div>

            {/* Custom Dynamic Member Fields */}
            <div className="rounded-2xl border border-indigo-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-[#18234A]">
                    Member Onboarding Fields
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Information requested from prospective members when joining.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomAdder((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-[#5934bd] border border-indigo-200 hover:bg-violet-50 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Field
                </button>
              </div>

              {/* Existing Field Chips */}
              <div className="mt-3 grid gap-2">
                {memberFields.map((field, idx) => (
                  <div
                    key={field.label + idx}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#081233]">{field.label}</span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
                        {field.field_type}
                      </span>
                      {field.is_required && (
                        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                          Required
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove field ${field.label}`}
                      onClick={() => handleRemoveField(idx)}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Field Form */}
              {showCustomAdder && (
                <div className="mt-3 rounded-xl border border-violet-200 bg-white p-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      placeholder="Field Label (e.g. Residence)"
                      value={customFieldLabel}
                      onChange={(e) => setCustomFieldLabel(e.target.value)}
                      className="text-xs"
                    />
                    <select
                      value={customFieldType}
                      onChange={(e) =>
                        setCustomFieldType(e.target.value as 'text' | 'phone' | 'number' | 'date')
                      }
                      className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs font-medium text-[#081233]"
                    >
                      <option value="text">Text Field</option>
                      <option value="phone">Phone Number</option>
                      <option value="number">Numeric Value</option>
                      <option value="date">Date</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs text-slate-600 px-1">
                      <input
                        type="checkbox"
                        checked={customFieldRequired}
                        onChange={(e) => setCustomFieldRequired(e.target.checked)}
                        className="accent-violet-600"
                      />
                      Is Required
                    </label>
                  </div>
                  <div className="mt-2.5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomAdder(false)}
                      className="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomField}
                      disabled={!customFieldLabel.trim()}
                      className="rounded-lg bg-[#7B3FF2] px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Save Field
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 5: REVIEW & INITIALIZE */}
        {step === 5 && (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4.5"
          >
            <div>
              <h3 className="font-heading text-base font-extrabold text-[#231044]">
                5. Review & Initialize Group
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Verify all operational parameters before creating your Ikimina.
              </p>
            </div>

            {/* Summary Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-indigo-100 bg-slate-50/70 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Group Identity
                </span>
                <p className="mt-1 text-sm font-black text-[#081233]">{name}</p>
                {location && <p className="text-xs text-slate-500">📍 {location}</p>}
                <p className="mt-1 text-[11px] font-semibold text-violet-700">
                  {discoverable
                    ? '🌐 Discoverable in group finder'
                    : '🔒 Private (Invitation only)'}
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-slate-50/70 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Operational Cycle
                </span>
                <p className="mt-1 text-sm font-black text-[#081233]">{cycleName} (2 Years)</p>
                <p className="text-xs text-slate-500">
                  {cycleStartDate} → {cycleEndDate}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Due day: Day {dueDay} of each month
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-slate-50/70 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Savings & Contributions
                </span>
                <p className="mt-1 text-xs text-slate-700">
                  Share price: <strong>{formatCurrency(shareUnitPrice)}</strong>
                </p>
                <p className="text-xs text-slate-700">
                  Social fund: <strong>{formatCurrency(socialContribution)} / mo</strong>
                </p>
                <p className="text-xs text-slate-500 mt-1">Currency: Rwandan Franc (RWF)</p>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-slate-50/70 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Mutual Loan Policies
                </span>
                <p className="mt-1 text-xs text-slate-700">
                  Max loan: <strong>{formatCurrency(loanMax)}</strong>
                </p>
                <p className="text-xs text-slate-700">
                  Rates: <strong>{rateUpTo4Months}%</strong> (≤4 mo) |{' '}
                  <strong>{rateOver4Months}%</strong> (&gt;4 mo)
                </p>
                <p className="text-xs text-slate-500 mt-1">Limit: 1 active loan per member</p>
              </div>
            </div>

            {/* Role Governance & Security Card */}
            <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 text-xs leading-relaxed">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
                Role Assignments & Permission Governance
              </span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="font-bold text-emerald-800 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" /> Assigned to Creator:
                  </p>
                  <ul className="mt-1 list-disc list-inside text-slate-600">
                    <li>Founding Member</li>
                    <li>Chairperson</li>
                    <li>Committee Member</li>
                    <li>System Administrator</li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-amber-800 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Appointed Separately:
                  </p>
                  <ul className="mt-1 list-disc list-inside text-slate-600">
                    <li>Treasurer (Requires committee ratification)</li>
                    <li>Secretary (Appointed via committee)</li>
                    <li>Financial approval dual-signoff</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wizard Footer Controls */}
      <div className="mt-6 flex items-center justify-between border-t border-indigo-50 pt-4">
        {step > 1 ? (
          <button
            type="button"
            disabled={pending}
            onClick={goToPreviousStep}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        ) : (
          <div />
        )}

        {step < 5 ? (
          <button
            type="button"
            onClick={goToNextStep}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#7B3FF2]/20 hover:opacity-95 transition"
          >
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={handleFinalSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2437F5] to-[#7B3FF2] px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#7B3FF2]/25 hover:opacity-95 transition disabled:opacity-60"
          >
            {pending ? (
              'Initializing group…'
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Initialize Group
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
