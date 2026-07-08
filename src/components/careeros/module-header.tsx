'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export function ModuleHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: string
  subtitle: string
  icon?: React.ElementType
  actions?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand ring-1 ring-brand/20">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h2 className="text-2xl sm:text-[28px] font-semibold tracking-tight leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </motion.div>
  )
}
