import { gsapMotion, prefersReducedMotion, registerIkiminaGsap } from './config'

export function animatePageTransition(element: HTMLElement, entering: boolean) {
  const gsap = registerIkiminaGsap()
  if (prefersReducedMotion()) { gsap.set(element, { clearProps: 'all' }); return }
  gsap.fromTo(element, entering ? { opacity: 0, y: 6 } : { opacity: 1, y: 0 }, entering ? { opacity: 1, y: 0, duration: gsapMotion.duration.normal, ease: gsapMotion.ease.enter } : { opacity: 0, y: -3, duration: gsapMotion.duration.fast, ease: gsapMotion.ease.exit })
}
