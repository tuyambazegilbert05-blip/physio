'use client'

import Link from 'next/link'
import { useCallback, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, ArrowRight, BookOpenCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useMounted } from '@/hooks/useMounted'

const guideSteps = [
  {
    title: 'Your Member dashboard',
    body: 'Start with your personal position: what you have contributed, what has been received, and what you still owe.',
    href: '/dashboard',
    link: 'Open my overview',
  },
  {
    title: 'Savings and shares',
    body: 'Review your verified savings, share units, pending transactions, and contribution history.',
    href: '/dashboard/my/savings',
    link: 'View savings and shares',
  },
  {
    title: 'Monthly contributions',
    body: 'See the amount expected, what you submitted, what the group received, and any remaining amount.',
    href: '/dashboard/my/contributions',
    link: 'View contributions',
  },
  {
    title: 'Social contribution',
    body: 'When configured, social contribution appears as one component of your monthly payment. It is not counted twice.',
    href: '/dashboard/my/contributions',
    link: 'Check social contribution',
  },
  {
    title: 'Loans and repayments',
    body: 'Your loan view separates original principal, principal repaid, interest paid, remaining principal, and interest due.',
    href: '/dashboard/my/loans',
    link: 'View my loans',
  },
  {
    title: 'Upcoming payments',
    body: 'Due dates and payment states help you identify what is due soon or delayed.',
    href: '/dashboard/my/loans',
    link: 'Review payments',
  },
  {
    title: 'Notifications',
    body: 'Find payment reminders, received-payment confirmations, and official updates for your account.',
    href: '/dashboard/notifications',
    link: 'Open notifications',
  },
  {
    title: 'Statements',
    body: 'Review or download your own recorded financial activity for a meeting or your records.',
    href: '/dashboard/my/statements',
    link: 'Open statements',
  },
  {
    title: 'Contact officials',
    body: 'Send a private question to authorized group officials about your records or obligations.',
    href: '/dashboard/my/communications',
    link: 'Contact an official',
  },
]

export function MemberGuide({ groupId, memberId }: { groupId: string; memberId: string }) {
  const [openedManually, setOpenedManually] = useState(false)
  const [step, setStep] = useState(0)
  const storageKey = `ikimina-member-guide:${groupId}:${memberId}`
  const mounted = useMounted()
  const subscribe = useCallback(
    (onChange: () => void) => {
      const listener = (event: StorageEvent) => {
        if (event.key === storageKey) onChange()
      }
      window.addEventListener('storage', listener)
      return () => window.removeEventListener('storage', listener)
    },
    [storageKey],
  )
  const getSnapshot = useCallback(() => window.localStorage.getItem(storageKey) === 'done', [storageKey])
  const completed = useSyncExternalStore(subscribe, getSnapshot, () => true)
  const open = openedManually || (mounted && !completed)

  const close = useCallback(() => {
    window.localStorage.setItem(storageKey, 'done')
    setOpenedManually(false)
  }, [storageKey])

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setStep(0)
            setOpenedManually(true)
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white/90 px-3.5 py-2 text-[11px] font-bold text-violet-800 transition hover:bg-violet-50"
        >
          <BookOpenCheck className="h-3.5 w-3.5" /> Member guide
        </button>
      </div>
      <Modal open={open} title="Member onboarding guide" onClose={close}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              Step {step + 1} of {guideSteps.length}
            </span>
            <button
              type="button"
              onClick={close}
              className="text-[11px] font-semibold text-slate-500 hover:text-violet-700"
            >
              Skip guide
            </button>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-violet-50/70 p-5">
            <h2 className="font-heading text-lg font-extrabold text-[#231044]">
              {guideSteps[step]!.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{guideSteps[step]!.body}</p>
            <Link
              href={guideSteps[step]!.href}
              onClick={close}
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-700 hover:text-violet-900"
            >
              {guideSteps[step]!.link} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 px-3.5 py-2.5 text-[11px] font-bold text-slate-600 disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            {step < guideSteps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((current) => current + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#6f25df] px-4 py-2.5 text-[11px] font-bold text-white"
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={close}
                className="rounded-xl bg-[#6f25df] px-4 py-2.5 text-[11px] font-bold text-white"
              >
                Finish guide
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
