export const motionDurations = {
  fast: 0.14,
  normal: 0.24,
  slow: 0.38,
} as const

export const motionSprings = {
  soft: { type: 'spring', stiffness: 150, damping: 25 },
  medium: { type: 'spring', stiffness: 260, damping: 28 },
  snappy: { type: 'spring', stiffness: 380, damping: 32 },
} as const
