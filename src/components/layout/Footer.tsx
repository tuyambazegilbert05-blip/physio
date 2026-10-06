import { BrandLogo } from '@/components/ui/BrandLogo'

export function Footer() {
  return (
    <footer className="border-t border-white/75 bg-white/35 px-5 py-5 text-center text-xs text-slate-500 backdrop-blur-xl sm:px-8">
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
        <BrandLogo size={22} wordmarkClassName="font-heading text-sm font-bold text-[#081233]" />
        <span aria-hidden="true" className="text-indigo-300">
          ·
        </span>
        <span className="font-medium">Community savings, managed together</span>
      </div>
    </footer>
  )
}
