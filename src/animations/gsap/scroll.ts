import { gsapMotion, prefersReducedMotion, registerPhyaioCycleGsap } from './config'

export function revealOnScroll(root: HTMLElement, selector = '[data-scroll-reveal]') {
  const gsap = registerPhyaioCycleGsap()
  const context = gsap.context(() => {
    if (prefersReducedMotion()) return
    gsap.fromTo(selector, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: gsapMotion.duration.slow, stagger: gsapMotion.stagger.small, ease: gsapMotion.ease.enter, scrollTrigger: { trigger: selector, start: 'top 88%', once: true } })
  }, root)
  return () => context.revert()
}
