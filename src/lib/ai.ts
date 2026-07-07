import ZAI from 'z-ai-web-dev-sdk'

// AI Gateway — single entry point for all LLM calls in CareerOS AI.
// Supports structured JSON output, retries, usage tracking and a typed API.

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getZai() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AiResult<T> = {
  data: T
  raw: string
  tokens: number
}

/**
 * Low-level completion helper with retry + JSON parsing.
 */
export async function complete(
  messages: ChatMessage[],
  opts: { json?: boolean; retries?: number } = {}
): Promise<string> {
  const { retries = 2 } = opts
  const zai = await getZai()
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: messages as any,
        thinking: { type: 'disabled' },
      })
      const content = completion.choices[0]?.message?.content ?? ''
      if (!content.trim()) throw new Error('Empty AI response')
      return content
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI request failed')
}

/**
 * Ask the model to return strict JSON. Strips code fences and extracts the
 * first JSON object/array found in the response.
 */
export async function completeJson<T = unknown>(
  messages: ChatMessage[],
  opts: { retries?: number } = {}
): Promise<AiResult<T>> {
  const raw = await complete(
    [
      ...messages,
      {
        role: 'system',
        content:
          'CRITICAL: Respond with valid minified JSON only. No markdown, no code fences, no commentary. The entire response must be parseable by JSON.parse().',
      },
    ],
    { json: true, retries: opts.retries ?? 2 }
  )

  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // Try direct parse first, then extract the largest JSON blob.
  let parsed: T
  try {
    parsed = JSON.parse(cleaned) as T
  } catch {
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (!match) throw new Error('Failed to parse AI JSON response')
    parsed = JSON.parse(match[1]) as T
  }

  return { data: parsed, raw, tokens: Math.ceil(cleaned.length / 4) }
}

/**
 * Streaming completion for chat-style UX. Calls onToken for every chunk.
 */
export async function completeStream(
  messages: ChatMessage[],
  onToken: (delta: string) => void
): Promise<string> {
  const zai = await getZai()
  const completion = await zai.chat.completions.create({
    messages: messages as any,
    thinking: { type: 'disabled' },
    stream: true,
  } as any)

  let full = ''
  try {
    for await (const chunk of completion as any) {
      const delta = chunk?.choices?.[0]?.delta?.content ?? ''
      if (delta) {
        full += delta
        onToken(delta)
      }
    }
  } catch {
    // Some SDK versions don't support streaming — fall back to non-stream.
    if (!full) {
      const fallback = await complete(messages)
      onToken(fallback)
      return fallback
    }
  }
  return full || (await complete(messages))
}

// ---------------------------------------------------------------------------
// Domain-specific prompt helpers
// ---------------------------------------------------------------------------

export const ai = {
  /** Enhance / rewrite a single resume bullet into a quantified achievement. */
  async enhanceBullet(text: string, mode: 'rewrite' | 'achievement' | 'impact' | 'keywords' = 'rewrite') {
    const sys: ChatMessage = {
      role: 'system',
      content:
        'You are an elite resume writer and former Fortune-500 recruiter. Transform weak task descriptions into powerful, quantified accomplishments using strong action verbs. Be concise (max 2 lines). Never invent fake metrics — infer realistic ranges with "approx." when needed.',
    }
    const user: ChatMessage = {
      role: 'user',
      content: `${mode.toUpperCase()} mode.\nOriginal: "${text}"\nReturn ONLY the rewritten bullet, no preamble.`,
    }
    return complete([sys, user])
  },

  /** Generate an entire resume draft from raw user context. */
  async generateResume(context: string) {
    return completeJson<any>([
      {
        role: 'system',
        content:
          'You are CareerOS AI, a world-class resume architect. Produce ATS-optimized, recruiter-friendly resume content. Use action verbs, quantify impact, and keep it honest. Return strict JSON.',
      },
      {
        role: 'user',
        content: `Create a complete resume from this context. Return JSON with shape: { "summary": string, "experience": [{ "title": string, "company": string, "location": string, "startDate": string, "endDate": string, "bullets": string[] }], "education": [{ "degree": string, "school": string, "location": string, "startDate": string, "endDate": string, "details": string }], "skills": string[], "projects": [{ "name": string, "description": string, "link": string }], "certifications": [{ "name": string, "issuer": string, "date": string }] }.\n\nContext: ${context}`,
      },
    ])
  },

  /** ATS analysis: score resume against a job description. */
  async analyzeAts(resumeText: string, jobDescription: string) {
    return completeJson<any>([
      {
        role: 'system',
        content:
          'You are an ATS (Applicant Tracking System) expert and senior technical recruiter. Analyze how well a resume matches a job description. Be rigorous, specific and actionable. Return strict JSON only.',
      },
      {
        role: 'user',
        content: `Analyze this resume against the job description.\n\nRESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nReturn JSON: { "score": number (0-100), "grade": "A"|"B"|"C"|"D"|"F", "matchedKeywords": string[], "missingKeywords": string[], "strengths": string[], "weaknesses": string[], "formattingIssues": string[], "recommendations": [{ "priority": "high"|"medium"|"low", "area": string, "suggestion": string }], "readabilityScore": number, "keywordScore": number, "experienceScore": number }`,
      },
    ])
  },

  /** Generate a cover letter or email variant. */
  async generateLetter(type: string, resumeContext: string, jobContext: string, tone: string) {
    return complete([
      {
        role: 'system',
        content:
          'You are an expert career copywriter who crafts compelling, personalized, human-sounding professional correspondence. Avoid clichés and generic openings. Match the requested tone. Output the letter body only — no subject line unless it is an email type.',
      },
      {
        role: 'user',
        content: `Type: ${type}\nTone: ${tone}\n\nCandidate context:\n${resumeContext}\n\nTarget role / company / context:\n${jobContext}\n\nWrite the ${type}. Make it specific, genuine and concise (150-250 words).`,
      },
    ])
  },

  /** Interview: generate the next question or evaluate an answer. */
  async interviewNext(type: string, role: string, history: ChatMessage[]) {
    const clean = history.map((m) => ({ role: m.role, content: m.content }))
    const msgs: ChatMessage[] = clean.length
      ? clean
      : [{ role: 'user', content: `Begin the ${type} interview for the ${role} position now. Ask your first question only.` }]
    return complete([
      {
        role: 'system',
        content: `You are a realistic ${type} interviewer for a "${role}" position. Ask one focused question at a time that a real interviewer would ask. Adapt difficulty based on the candidate's previous answers. Do not give away answers. Ask follow-ups when relevant. Reply with ONLY the next question (and a brief 1-line reaction to their previous answer if they gave one).`,
      },
      ...msgs.slice(-8),
    ])
  },

  async interviewEvaluate(type: string, role: string, question: string, answer: string) {
    return completeJson<any>([
      {
        role: 'system',
        content:
          'You are a senior hiring manager and interview coach. Evaluate the candidate answer rigorously but constructively. Return strict JSON.',
      },
      {
        role: 'user',
        content: `Interview type: ${type}\nRole: ${role}\nQuestion: ${question}\nCandidate answer: ${answer}\n\nReturn JSON: { "score": number (0-100), "strengths": string[], "improvements": string[], "modelAnswer": string, "feedback": string }`,
      },
    ])
  },

  /** Career coach chat. */
  async coach(history: ChatMessage[], focus: string) {
    return complete([
      {
        role: 'system',
        content: `You are CareerOS AI Coach — a world-class career strategist with the insight of an executive coach and the warmth of a trusted mentor. Focus area: ${focus}. Be specific, actionable and encouraging. Ask clarifying questions when useful. Use markdown formatting with short paragraphs and occasional bullet lists. Keep replies under 250 words unless a detailed plan is requested.`,
      },
      ...history.slice(-12),
    ])
  },

  /** Skill gap analysis + roadmap. */
  async skillAnalysis(currentSkills: string[], targetRole: string) {
    return completeJson<any>([
      {
        role: 'system',
        content:
          'You are a senior career development strategist and learning designer. Produce a rigorous, realistic skill-gap analysis and learning roadmap. Return strict JSON.',
      },
      {
        role: 'user',
        content: `Current skills: ${currentSkills.join(', ')}\nTarget role: ${targetRole}\n\nReturn JSON: { "gaps": [{ "skill": string, "priority": "high"|"medium"|"low", "gap": string }], "roadmap": [{ "phase": string, "duration": string, "focus": string, "actions": string[], "courses": [{ "name": string, "provider": string, "reason": string }] }], "certifications": [{ "name": string, "issuer": string, "value": string }], "estimatedTimeToReady": string }`,
      },
    ])
  },
}
