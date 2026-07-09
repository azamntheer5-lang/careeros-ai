'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import { Sidebar } from '@/components/careeros/sidebar'
import { Topbar } from '@/components/careeros/topbar'
import { Footer } from '@/components/careeros/footer'
import { LoadingScreen } from '@/components/careeros/loading'
import { CommandPalette } from '@/components/careeros/command-palette'
import { Onboarding } from '@/components/careeros/onboarding'
import { AssessmentOnboarding } from '@/components/careeros/assessment-onboarding'
import { FloatingAssistant } from '@/components/careeros/floating-assistant'

// Code-split all modules — only load the active module's code
const DashboardModule = dynamic(() => import('@/components/modules/dashboard').then(m => ({ default: m.DashboardModule })))
const ProfileModule = dynamic(() => import('@/components/modules/profile').then(m => ({ default: m.ProfileModule })))
const AgentsModule = dynamic(() => import('@/components/modules/agents').then(m => ({ default: m.AgentsModule })))
const GraphModule = dynamic(() => import('@/components/modules/graph').then(m => ({ default: m.GraphModule })))
const AutomationModule = dynamic(() => import('@/components/modules/automation').then(m => ({ default: m.AutomationModule })))
const ResumeModule = dynamic(() => import('@/components/modules/resume').then(m => ({ default: m.ResumeModule })))
const AtsModule = dynamic(() => import('@/components/modules/ats').then(m => ({ default: m.AtsModule })))
const CoverModule = dynamic(() => import('@/components/modules/cover').then(m => ({ default: m.CoverModule })))
const PortfolioModule = dynamic(() => import('@/components/modules/portfolio').then(m => ({ default: m.PortfolioModule })))
const BrandingModule = dynamic(() => import('@/components/modules/branding').then(m => ({ default: m.BrandingModule })))
const DocumentsModule = dynamic(() => import('@/components/modules/documents').then(m => ({ default: m.DocumentsModule })))
const InterviewModule = dynamic(() => import('@/components/modules/interview').then(m => ({ default: m.InterviewModule })))
const CoachModule = dynamic(() => import('@/components/modules/coach').then(m => ({ default: m.CoachModule })))
const IntelligenceModule = dynamic(() => import('@/components/modules/intelligence').then(m => ({ default: m.IntelligenceModule })))
const JobsModule = dynamic(() => import('@/components/modules/jobs').then(m => ({ default: m.JobsModule })))
const SkillsModule = dynamic(() => import('@/components/modules/skills').then(m => ({ default: m.SkillsModule })))
const MarketModule = dynamic(() => import('@/components/modules/market').then(m => ({ default: m.MarketModule })))
const NetworkModule = dynamic(() => import('@/components/modules/network').then(m => ({ default: m.NetworkModule })))
const MentorsModule = dynamic(() => import('@/components/modules/mentors').then(m => ({ default: m.MentorsModule })))
const AiCenterModule = dynamic(() => import('@/components/modules/aicenter').then(m => ({ default: m.AiCenterModule })))
const EnterpriseModule = dynamic(() => import('@/components/modules/enterprise').then(m => ({ default: m.EnterpriseModule })))
const PlansModule = dynamic(() => import('@/components/modules/plans').then(m => ({ default: m.PlansModule })))
const AdminModule = dynamic(() => import('@/components/modules/admin').then(m => ({ default: m.AdminModule })))
const RecruitModule = dynamic(() => import('@/components/modules/recruit').then(m => ({ default: m.RecruitModule })))
const MarketplaceModule = dynamic(() => import('@/components/modules/marketplace').then(m => ({ default: m.MarketplaceModule })))
const AnalyticsModule = dynamic(() => import('@/components/modules/analytics').then(m => ({ default: m.AnalyticsModule })))
const SecurityModule = dynamic(() => import('@/components/modules/security').then(m => ({ default: m.SecurityModule })))
const BriefingModule = dynamic(() => import('@/components/modules/briefing').then(m => ({ default: m.BriefingModule })))
const ResumeStudioModule = dynamic(() => import('@/components/modules/resume-studio').then(m => ({ default: m.ResumeStudioModule })))

type User = { id: string; name: string; plan: string; headline: string }

export default function Page() {
  const { active } = useAppStore()
  const [user, setUser] = useState<User | null>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    api<{ user: User }>('/api/bootstrap')
      .then(({ user }) => setUser(user))
      .catch(() => {})
      .finally(() => setBooted(true))
  }, [])

  if (!booted || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 grid-bg" />
        <LoadingScreen label="Booting CareerOS AI…" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  {active === 'dashboard' && <DashboardModule userName={user.name} />}
                  {active === 'profile' && <ProfileModule />}
                  {active === 'agents' && <AgentsModule />}
                  {active === 'graph' && <GraphModule />}
                  {active === 'automation' && <AutomationModule />}
                  {active === 'resume' && <ResumeModule />}
                  {active === 'ats' && <AtsModule />}
                  {active === 'cover' && <CoverModule />}
                  {active === 'portfolio' && <PortfolioModule />}
                  {active === 'branding' && <BrandingModule />}
                  {active === 'documents' && <DocumentsModule />}
                  {active === 'interview' && <InterviewModule />}
                  {active === 'coach' && <CoachModule />}
                  {active === 'intelligence' && <IntelligenceModule />}
                  {active === 'jobs' && <JobsModule />}
                  {active === 'skills' && <SkillsModule />}
                  {active === 'market' && <MarketModule />}
                  {active === 'network' && <NetworkModule />}
                  {active === 'mentors' && <MentorsModule />}
                  {active === 'aicenter' && <AiCenterModule />}
                  {active === 'enterprise' && <EnterpriseModule />}
                  {active === 'plans' && <PlansModule />}
                  {active === 'recruit' && <RecruitModule />}
                  {active === 'marketplace' && <MarketplaceModule />}
                  {active === 'analytics' && <AnalyticsModule />}
                  {active === 'security' && <SecurityModule />}
                  {active === 'briefing' && <BriefingModule />}
                  {active === 'studio' && <ResumeStudioModule />}
                  {active === 'admin' && <AdminModule />}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
      <Footer />
      <CommandPalette />
      <Onboarding />
      <AssessmentOnboarding />
      <FloatingAssistant />
    </div>
  )
}
