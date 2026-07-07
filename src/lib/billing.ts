// SaaS Plans + AI Credit Economy
// Defines the 5 commercial plans, their credit allowances, and credit costs per feature.

export type PlanId = 'free' | 'starter' | 'professional' | 'career_pro' | 'enterprise'

export type PlanDef = {
  id: PlanId
  name: string
  priceMonthly: number   // USD cents
  priceAnnual: number    // USD cents (per year)
  credits: number        // AI credits per month
  features: string[]
  limits: { resumes: number; portfolios: number; interviews: number; agents: 'none' | 'limited' | 'unlimited' }
  highlight?: boolean
  badge?: string
}

export const PLANS: PlanDef[] = [
  {
    id: 'free', name: 'Free', priceMonthly: 0, priceAnnual: 0, credits: 50,
    features: ['1 resume', 'Basic ATS analysis', '3 cover letters / month', '1 portfolio', 'Text interview practice', 'Community support'],
    limits: { resumes: 1, portfolios: 1, interviews: 5, agents: 'none' },
  },
  {
    id: 'starter', name: 'Starter', priceMonthly: 1900, priceAnnual: 19000, credits: 300,
    features: ['3 resumes', 'Full ATS intelligence', 'Unlimited cover letters', '2 portfolios', 'Voice interviews', 'AI Career Coach', 'Career knowledge graph', 'Email support'],
    limits: { resumes: 3, portfolios: 2, interviews: 50, agents: 'limited' },
    badge: 'Popular',
  },
  {
    id: 'professional', name: 'Professional', priceMonthly: 4900, priceAnnual: 49000, credits: 1500,
    features: ['10 resumes', 'All ATS 2.0 features', 'Unlimited portfolios', 'Voice + video interviews', 'All 5 AI agents', 'Automation workflows', 'Document AI (OCR)', 'Job market intelligence', 'Priority support'],
    limits: { resumes: 10, portfolios: 10, interviews: 500, agents: 'unlimited' },
    highlight: true,
    badge: 'Best Value',
  },
  {
    id: 'career_pro', name: 'Career Pro', priceMonthly: 9900, priceAnnual: 99000, credits: 5000,
    features: ['Unlimited resumes', 'Everything in Professional', 'Dedicated AI career agent (daily briefings)', '1:1 mentor matching', 'Recruiter network access', 'Advanced analytics', 'Personal brand audit', 'White-glove support'],
    limits: { resumes: -1, portfolios: -1, interviews: -1, agents: 'unlimited' },
    badge: 'Premium',
  },
  {
    id: 'enterprise', name: 'Enterprise', priceMonthly: 0, priceAnnual: 0, credits: -1, // custom
    features: ['Everything in Career Pro', 'Multi-tenant org workspace', 'Team collaboration', 'SSO + MFA + audit logs', 'Recruitment platform', 'University edition', 'Custom AI models', 'SLA + dedicated manager', 'On-premise option'],
    limits: { resumes: -1, portfolios: -1, interviews: -1, agents: 'unlimited' },
    badge: 'Custom',
  },
]

export function getPlan(id: string): PlanDef {
  return PLANS.find((p) => p.id === id) || PLANS[0]
}

// AI Credit costs per feature (in credits)
export const CREDIT_COSTS: Record<string, number> = {
  resume_enhance: 1,
  resume_generate: 5,
  resume_score: 3,
  ats_analyze: 4,
  ats_recruiter: 3,
  ats_competitor: 4,
  cover_letter: 3,
  interview_next: 1,
  interview_evaluate: 2,
  interview_confidence: 2,
  coach: 2,
  skill_analysis: 5,
  career_plan: 8,
  linkedin_optimize: 5,
  brand_identity: 4,
  agent_run: 4,
  job_market: 6,
  job_match: 3,
  document_parse: 5,
  assistant: 1,
  briefing: 3,
}

export const CREDIT_PACKAGES = [
  { id: 'starter', credits: 100, price: 500, bonus: 0, label: '100 credits' },     // $5
  { id: 'boost', credits: 500, price: 2000, bonus: 50, label: '500 + 50 bonus' },  // $20
  { id: 'pro', credits: 1500, price: 5000, bonus: 200, label: '1500 + 200 bonus' },// $50
  { id: 'mega', credits: 5000, price: 15000, bonus: 1000, label: '5000 + 1000 bonus' }, // $150
]

/** Check if a user can afford a feature, given their credit balance. */
export function canAfford(credits: number, feature: string): boolean {
  const cost = CREDIT_COSTS[feature] ?? 1
  return credits >= cost
}

/** Smart model selection: pick the cheapest model tier that satisfies the user's plan + feature. */
export function selectModel(plan: PlanId, feature: string): 'fast' | 'balanced' | 'quality' {
  // Free plan: always fast (cost-optimized)
  if (plan === 'free') return 'fast'
  // Starter: fast for simple, balanced for complex
  if (plan === 'starter') {
    const complex = ['resume_generate', 'ats_analyze', 'skill_analysis', 'career_plan', 'linkedin_optimize', 'job_market']
    return complex.includes(feature) ? 'balanced' : 'fast'
  }
  // Pro+ and Career Pro: quality for complex, balanced for standard
  const quality = ['resume_generate', 'ats_analyze', 'skill_analysis', 'career_plan', 'linkedin_optimize', 'job_market', 'agent_career']
  if (quality.includes(feature)) return 'quality'
  return 'balanced'
}
