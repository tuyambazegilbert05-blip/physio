import { BrandLogo } from '@/components/ui/BrandLogo'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <BrandLogo size={22} wordmarkClassName="text-sm" />
        <span aria-hidden="true">·</span>
        <span>Community savings workspace</span>
      </div>
    </footer>
  )
}
