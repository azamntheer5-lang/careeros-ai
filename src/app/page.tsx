'use client'

import { useEffect, useState } from 'react'
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
import { DashboardModule } from '@/components/modules/dashboard'
import { ProfileModule } from '@/components/modules/profile'
import { AgentsModule } from '@/components/modules/agents'
import { GraphModule } from '@/components/modules/graph'
import { AutomationModule } from '@/components/modules/automation'
import { ResumeModule } from '@/components/modules/resume'
import { AtsModule } from '@/components/modules/ats'
import { CoverModule } from '@/components/modules/cover'
import { PortfolioModule } from '@/components/modules/portfolio'
import { BrandingModule } from '@/components/modules/branding'
import { DocumentsModule } from '@/components/modules/documents'
import { InterviewModule } from '@/components/modules/interview'
import { CoachModule } from '@/components/modules/coach'
import { IntelligenceModule } from '@/components/modules/intelligence'
import { JobsModule } from '@/components/modules/jobs'
import { SkillsModule } from '@/components/modules/skills'
import { MarketModule } from '@/components/modules/market'
import { NetworkModule } from '@/components/modules/network'
import { MentorsModule } from '@/components/modules/mentors'
import { AiCenterModule } from '@/components/modules/aicenter'
import { EnterpriseModule } from '@/components/modules/enterprise'
import { PlansModule } from '@/components/modules/plans'
import { AdminModule } from '@/components/modules/admin'
import { RecruitModule } from '@/components/modules/recruit'
import { MarketplaceModule } from '@/components/modules/marketplace'
import { AnalyticsModule } from '@/components/modules/analytics'
import { SecurityModule } from '@/components/modules/security'
import { BriefingModule } from '@/components/modules/briefing'

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
