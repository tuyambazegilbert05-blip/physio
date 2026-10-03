export const scrollRevealConfig: IntersectionObserverInit = { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.12 }

export function observeRevealElements(root: ParentNode, callback: (element: Element) => void) {
  if (typeof IntersectionObserver === 'undefined') return () => undefined
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { callback(entry.target); observer.unobserve(entry.target) }
    })
  }, scrollRevealConfig)
  root.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element))
  return () => observer.disconnect()
}
