import { gsapMotion, prefersReducedMotion, registerPhyaioCycleGsap } from './config'

export function createHeroTimeline(root: HTMLElement) {
  const gsap = registerPhyaioCycleGsap()
  const context = gsap.context(() => {
    if (prefersReducedMotion()) return
    const timeline = gsap.timeline({ defaults: { ease: gsapMotion.ease.enter } })
    timeline.fromTo('[data-hero-eyebrow]', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: gsapMotion.duration.normal })
      .fromTo('[data-hero-title]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: gsapMotion.duration.slow }, '-=0.12')
      .fromTo('[data-hero-content]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: gsapMotion.duration.normal, stagger: gsapMotion.stagger.small }, '-=0.1')
  }, root)
  return () => context.revert()
}
