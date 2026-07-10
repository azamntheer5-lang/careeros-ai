'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import { useProfile } from '@/components/careeros/profile-context'
import { Spinner } from '@/components/careeros/loading'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, X, Send, Bot, Minus, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

type Msg = { role: 'user' | 'assistant'; content: string }

const QUICK = [
  'What should I focus on this week?',
  'Review my career graph',
  'Suggest my next 3 career moves',
  'Run all agents and summarize',
]

/** Global floating AI assistant — available on every module, context-aware. */
export function FloatingAssistant() {
  const { active } = useAppStore()
  const { profile, user } = useProfile()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset conversation when the panel is (re)opened, with a context-aware welcome.
  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ role: 'assistant', content: `Hi! I'm your CareerOS assistant. I can see you're on the **${active}** module. Ask me anything about your career, or pick a quick action below.` }])
    }
  }, [open, active, msgs.length])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgs, open])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || busy) return
    setInput('')
    setBusy(true)
    const next = [...msgs, { role: 'user' as const, content: msg }]
    setMsgs(next)
    try {
      const { reply } = await api<{ reply: string }>('/api/assistant', {
        method: 'POST', body: { message: msg, context: { module: active, targetRole: profile?.targetRole, plan: user?.plan } },
      })
      setMsgs([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: `Sorry, I couldn't process that: ${(e as Error).message}` }])
    } finally { setBusy(false) }
  }

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 end-5 z-40 h-14 w-14 rounded-full bg-brand text-brand-foreground shadow-lg hover:shadow-xl flex items-center justify-center group"
            aria-label="AI Assistant"
          >
            <span className="absolute inset-0 rounded-full bg-brand animate-ping opacity-20" />
            <Sparkles className="h-6 w-6 relative" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="fixed bottom-5 end-5 z-40 w-[calc(100vw-2.5rem)] sm:w-96 h-[min(600px,80vh)] rounded-2xl border border-border bg-popover shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-brand/15 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-brand-foreground"><Bot className="h-4 w-4" /></div>
                <div>
                  <div className="text-sm font-semibold leading-tight">CareerOS Assistant</div>
                  <div className="text-[10px] text-muted-foreground">Context: {active}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMinimized(!minimized)} className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center" aria-label="Minimize"><Minus className="h-3.5 w-3.5" /></button>
                <button onClick={() => setOpen(false)} className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center" aria-label="Close"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                  {msgs.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] ${m.role === 'user' ? 'bg-muted text-muted-foreground' : 'bg-gradient-to-br from-brand to-brand/60 text-brand-foreground'}`}>
                        {m.role === 'user' ? 'You' : <Sparkles className="h-3 w-3" />}
                      </div>
                      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-brand text-brand-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                        {m.role === 'assistant' ? <div className="prose-careeros text-sm"><ReactMarkdown>{m.content}</ReactMarkdown></div> : <div className="whitespace-pre-wrap">{m.content}</div>}
                      </div>
                    </motion.div>
                  ))}
                  {busy && (
                    <div className="flex gap-2">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-brand-foreground"><Sparkles className="h-3 w-3" /></div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                {msgs.length <= 1 && (
                  <div className="px-3 pb-1 flex flex-wrap gap-1.5">
                    {QUICK.map((q) => (
                      <button key={q} onClick={() => send(q)} className="text-[10px] rounded-full border px-2.5 py-1 hover:bg-accent hover:border-brand/40 transition flex items-center gap-1">
                        <Zap className="h-2.5 w-2.5 text-brand" /> {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="border-t p-2.5 flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                    placeholder="Ask about your career…"
                    disabled={busy}
                    rows={1}
                    className="flex-1 min-h-9 max-h-24 resize-none text-sm"
                  />
                  <Button onClick={() => send()} disabled={busy || !input.trim()} size="icon" className="bg-brand text-brand-foreground hover:bg-brand/90 h-9 w-9 shrink-0">
                    {busy ? <Spinner /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
