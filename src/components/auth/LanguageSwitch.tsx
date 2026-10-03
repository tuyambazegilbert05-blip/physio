'use client'

type LanguageSwitchProps = {
  currentLang: 'en' | 'rw'
  onToggle: (lang: 'en' | 'rw') => void
  className?: string
}

export function LanguageSwitch({ currentLang, onToggle, className = '' }: LanguageSwitchProps) {
  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm border border-slate-200/80 p-0.5 shadow-xs text-xs font-semibold select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => onToggle('en')}
        className={`px-3 py-1 rounded-full transition-all duration-200 ${
          currentLang === 'en'
            ? 'bg-[#081233] text-white shadow-xs font-bold'
            : 'text-slate-500 hover:text-[#081233]'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onToggle('rw')}
        className={`px-3 py-1 rounded-full transition-all duration-200 ${
          currentLang === 'rw'
            ? 'bg-[#081233] text-white shadow-xs font-bold'
            : 'text-slate-500 hover:text-[#081233]'
        }`}
      >
        RW
      </button>
    </div>
  )
}
