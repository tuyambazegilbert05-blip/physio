import type { ImgHTMLAttributes } from 'react'

type AvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> & { name: string; alt?: string }

export function Avatar({ name, src, className = '', alt, ...props }: AvatarProps) {
  if (src) return <img src={src} alt={alt ?? name} className={`size-9 rounded-full object-cover ${className}`} {...props} />
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'
  return <span aria-label={name} role="img" className={`inline-grid size-9 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-800 ${className}`}>{initials}</span>
}
