'use client'

import { AnimatePresence, motion } from 'motion/react'

export function Toast({ message, onDismiss }: { message?: string; onDismiss: () => void }) {
  return <AnimatePresence>{message && <motion.div role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.18 }} className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-4 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"><span>{message}</span><button type="button" aria-label="Dismiss notification" onClick={onDismiss} className="text-white/70 hover:text-white">×</button></motion.div>}</AnimatePresence>
}
