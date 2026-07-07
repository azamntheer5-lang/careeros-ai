'use client'

import { motion } from 'framer-motion'

export function Logo({ size = 32, animated = true }: { size?: number; animated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className="shrink-0">
      <defs>
        <linearGradient id="careeros-grad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="oklch(0.7 0.13 200)" />
        </linearGradient>
      </defs>
      <motion.rect
        x="3" y="3" width="42" height="42" rx="12"
        fill="url(#careeros-grad)"
        initial={animated ? { scale: 0.8, opacity: 0 } : false}
        animate={animated ? { scale: 1, opacity: 1 } : false}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      />
      {/* orbit + rising bar chart glyph */}
      <circle cx="24" cy="24" r="11" stroke="white" strokeOpacity="0.9" strokeWidth="2.2" fill="none" />
      <path d="M16 28 L20 24 L24 26 L32 17" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="32" cy="17" r="2.4" fill="white" />
    </svg>
  )
}
