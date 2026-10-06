'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { evaluatePasswordStrength } from '@/features/auth/schemas/password-policy'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/Input'

const bars = ['bg-rose-500', 'bg-orange-400', 'bg-amber-400', 'bg-emerald-500', 'bg-emerald-700']

export function PasswordPolicyFields({
  password,
  confirmation,
  onPasswordChange,
  onConfirmationChange,
  prefix,
}: {
  password: string
  confirmation: string
  onPasswordChange: (value: string) => void
  onConfirmationChange: (value: string) => void
  prefix: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const strength = evaluatePasswordStrength(password)
  const mismatch = Boolean(confirmation && password !== confirmation)

  return (
    <>
      <FormField htmlFor={`${prefix}-password`} label="Password">
        <div className="relative">
          <Input
            id={`${prefix}-password`}
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            required
          />
          <PasswordVisibility visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
        </div>
        <div aria-live="polite" className="mt-2">
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${index < Math.min(strength.score, 5) ? bars[Math.min(strength.score, 5) - 1] : 'bg-slate-200'}`}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Password strength: {strength.label}
          </p>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Use at least 8 characters. A longer passphrase or a mix of letters, numbers, and symbols
          is safer; six or eight characters alone is not considered strong.
        </p>
      </FormField>
      <FormField
        htmlFor={`${prefix}-confirm-password`}
        label="Confirm password"
        error={mismatch ? 'Passwords do not match.' : undefined}
      >
        <div className="relative">
          <Input
            id={`${prefix}-confirm-password`}
            name="confirmPassword"
            type={showConfirmation ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            value={confirmation}
            onChange={(event) => onConfirmationChange(event.target.value)}
            aria-invalid={mismatch}
            required
          />
          <PasswordVisibility visible={showConfirmation} onToggle={() => setShowConfirmation((value) => !value)} />
        </div>
      </FormField>
    </>
  )
}

function PasswordVisibility({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={visible ? 'Hide password' : 'Show password'}
      onClick={onToggle}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )
}
