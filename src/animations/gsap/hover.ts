import { gsapMotion, prefersReducedMotion, registerPhyaioCycleGsap } from './config'

export function bindSubtleHover(element: HTMLElement) {
  if (prefersReducedMotion()) return () => undefined
  const gsap = registerPhyaioCycleGsap()
  const enter = () => gsap.to(element, { y: -2, duration: gsapMotion.duration.fast, ease: gsapMotion.ease.standard })
  const leave = () => gsap.to(element, { y: 0, duration: gsapMotion.duration.fast, ease: gsapMotion.ease.standard })
  element.addEventListener('pointerenter', enter)
  element.addEventListener('pointerleave', leave)
  return () => { element.removeEventListener('pointerenter', enter); element.removeEventListener('pointerleave', leave); gsap.killTweensOf(element) }
}
