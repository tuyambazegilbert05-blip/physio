import { gsapMotion, prefersReducedMotion, registerIkiminaGsap } from './config'

export function animateConfirmedCounter(element: HTMLElement, from: number, to: number, format: (value: number) => string) {
  const gsap = registerIkiminaGsap()
  if (!Number.isFinite(from) || !Number.isFinite(to)) return () => undefined
  const value = { current: from }
  if (prefersReducedMotion()) { element.textContent = format(to); return () => undefined }
  const tween = gsap.to(value, { current: to, duration: gsapMotion.duration.slow, ease: gsapMotion.ease.standard, onUpdate: () => { element.textContent = format(Math.round(value.current)) } })
  return () => tween.kill()
}
