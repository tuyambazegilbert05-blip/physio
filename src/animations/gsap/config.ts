import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false
export function registerIkiminaGsap() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
  return gsap
}

export const registerPhyaioCycleGsap = registerIkiminaGsap

export const gsapMotion = {
  duration: { fast: 0.14, normal: 0.24, slow: 0.38, hero: 0.8 },
  ease: { standard: 'power2.out', emphasized: 'power3.out', enter: 'power2.out', exit: 'power1.in' },
  stagger: { small: 0.04, medium: 0.07, large: 0.11 },
} as const

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
