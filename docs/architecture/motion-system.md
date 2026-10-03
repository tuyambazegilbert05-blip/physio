# Phyaio Cycle motion system

Motion communicates state, hierarchy, continuity, and feedback. It must never compete with financial information or imply that an operation succeeded before the server confirms it. Keep movement restrained, quick, accessible, and tied to a user or data event.

## Technology ownership

| Technology | Use it for | Keep it out of |
| --- | --- | --- |
| CSS | Focus, hover, loading indicators, skeletons, and simple transforms or opacity changes | Complex timelines or business state |
| Motion for React | Component enter/exit, dialogs, drawers, menus, tabs, layout changes, toasts, and button feedback | Scroll storytelling and decorative illustrations |
| GSAP | Hero choreography, coordinated timelines, ScrollTrigger, pinned storytelling, and complex SVG or camera sequences | Routine component state transitions |
| Lottie | Illustrated onboarding, success, empty, savings, and community states | Small UI transitions and controls |
| Three.js / React Three Fiber | Supplementary 3D scenes that materially benefit from depth | Core data, navigation, forms, or financial information |

Use one animation owner per component. Choose CSS if it is sufficient, then Motion for React for component behavior, GSAP for timeline or scroll choreography, Lottie for illustration, and Three.js only for a genuinely useful 3D view. ScrollReveal is reserved for simple static reveals and must not control elements already owned by ScrollTrigger.

Keep motion at four levels: quick control feedback, moderate component transitions, restrained section entrances, and rare immersive experiences. Stagger only when it helps show a group; never delay access to financial information. Page transitions should be brief and subtle. The paper visual language can inform a report, receipt, or ledger reveal, while the overall style stays precise and calm instead of relying on neon, glow, particles, or dramatic effects.

## Timing and movement

Use the shared values in `src/styles/variables.css` instead of introducing arbitrary durations. The tokens cover fast, normal, and slow timing; standard, emphasized, enter, and exit easing; and small, medium, and large stagger gaps. Use spring transitions for Motion interactions, with soft, medium, and snappy presets when those interactions are introduced.

Micro-interactions should usually take about 100–200 ms, ordinary UI transitions 200–400 ms, larger components 300–600 ms, and a hero sequence 500–1200 ms. These are guides: UI feedback should feel immediate, and exit transitions should be shorter than entrances. Favor opacity and small transforms. Avoid long delays, large travel, repeated number animation, exaggerated bounce, and unnecessary rotation or blur.

## Financial state and accessibility

Represent real state transitions: request, processing, server confirmation, then success and updated data. Never animate a speculative balance or a pending transaction as confirmed. Keep essential values and relationships available as HTML text or tables; never rely on color, motion, position, or WebGL alone.

The shared stylesheet honors `prefers-reduced-motion` by removing non-essential movement. Any future Motion, GSAP, Lottie, or 3D implementation must also honor the preference, with simplified or static behavior where appropriate. Core workflows must remain fully usable without animation or WebGL.

## Implementation and performance

- Scope GSAP work to a React lifecycle context and clean up timelines, ScrollTriggers, and listeners on unmount.
- Use responsive GSAP behavior: full choreography only where it suits desktop, reduced movement on tablet, and a simple reveal or static view on mobile.
- Lazy-load Lottie and 3D code and assets. Stop decorative loops when offscreen where practical.
- Keep 3D scenes isolated, low cost, and limited to one canvas per experience. Use a static HTML/SVG fallback, respect reduced motion, and lower scene detail on mobile.
- Keep Lottie definitions in a central registry. Match the Phyaio Cycle palette, stroke weight, and visual style.
- Use CSS for skeletons and simple control feedback. Do not animate fake data into existence or make users wait for a transition.
- Document major animations with their purpose, trigger, owner, mobile behavior, reduced-motion behavior, fallback, and performance cost.

## Review matrix

For any future motion-heavy feature, review desktop, tablet, mobile, keyboard use, reduced motion, slow network, low-power devices, route changes, and unavailable WebGL. Provide development controls to disable decorative motion and 3D when those systems are introduced. Keep the number of active timelines, Lottie instances, canvases, particles, and large textures within the page’s performance budget.

The current dashboard uses CSS transitions only; GSAP, Lottie, and Three.js are not loaded until a feature needs them.
