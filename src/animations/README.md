# Animation modules

CSS tokens define the shared motion timing and reduced-motion behavior. Motion for React is used for transient UI such as feedback toasts. GSAP helpers are scoped by purpose under `gsap/`; Lottie assets are loaded through the central registry; React Three Fiber scenes remain isolated under `three/` and use a static fallback when WebGL, desktop capability, or motion preference requires it.

Keep expensive libraries out of routes that do not use them. Use `motion/config.ts` and `gsap/config.ts` for shared timing values, choose one primary animation owner per component, and make server-confirmed application state the source for financial feedback.

See [the motion system](../../docs/architecture/motion-system.md) for technology ownership, financial-state rules, fallbacks, and accessibility requirements.
