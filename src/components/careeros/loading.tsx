'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
}

export function LoadingScreen({ label }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Spinner className="h-6 w-6 text-brand" />
        <p className="text-sm">{label || 'Loading…'}</p>
      </div>
    </div>
  )
}
