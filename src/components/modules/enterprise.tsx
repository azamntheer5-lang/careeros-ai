'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { LoadingScreen } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Building2,
  Users,
  TrendingUp,
  Layers,
  Award,
  Plus,
  ArrowUpRight,
  Sparkles,
  Target,
  GitBranch,
  Crown,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// --- Types ------------------------------------------------------------------

type TenantDTO = {
  id: string
  name: string
  type: string
  domain: string | null
  plan: string
  seats: number
  createdAt: string
}

type DepartmentDTO = {
  id: string
  name: string
  headcount: number
}

type EmployeeDTO = {
  id: string
  name: string
  email: string
  role: string | null
  departmentId: string | null
  departmentName: string | null
  level: string | null
  skills: string[]
  goals: string[]
  growthScore: number
}

type EnterpriseStats = {
  totalEmployees: number
  totalDepartments: number
  avgGrowth: number
  topSkill: string | null
}

type EnterpriseResponse = {
  tenant: TenantDTO
  departments: DepartmentDTO[]
  employees: EmployeeDTO[]
  stats: EnterpriseStats
}

type AnalyticsResponse = {
  topSkills: { skill: string; count: number }[]
  growthDistribution: { bucket: string; count: number }[]
  departmentHeadcount: { name: string; headcount: number }[]
  levelDistribution: { level: string; count: number }[]
  mobilityCandidates: {
    employeeId: string
    name: string
    role: string | null
    departmentName: string | null
    growthScore: number
    suggestedNextRole: string
    readinessScore: number
    matchedSkills: string[]
  }[]
}

// --- Constants --------------------------------------------------------------

const LEVELS = ['Junior', 'Mid', 'Senior', 'Staff', 'Lead'] as const

const LEVEL_BADGE_CLASS: Record<string, string> = {
  Junior: 'border-sky-500/40 text-sky-600 bg-sky-500/5',
  Mid: 'border-brand/40 text-brand bg-brand/5',
  Senior: 'border-violet-500/40 text-violet-600 bg-violet-500/5',
  Staff: 'border-amber-500/40 text-amber-600 bg-amber-500/5',
  Lead: 'border-rose-500/40 text-rose-600 bg-rose-500/5',
}

const PIE_COLORS = [
  'oklch(0.7 0.15 162)',
  'oklch(0.7 0.13 200)',
  'oklch(0.75 0.15 80)',
  'oklch(0.65 0.2 300)',
  'oklch(0.68 0.2 30)',
  'oklch(0.6 0.1 240)',
]

const DEPT_COLORS: Record<string, string> = {
  Engineering: 'oklch(0.7 0.15 162)',
  Product: 'oklch(0.7 0.13 200)',
  Design: 'oklch(0.75 0.15 80)',
}

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
}

// --- Main module ------------------------------------------------------------

export function EnterpriseModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [data, setData] = useState<EnterpriseResponse | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [activeEmployee, setActiveEmployee] = useState<EmployeeDTO | null>(null)
  const [adding, setAdding] = useState(false)

  // Form state for "Add Employee"
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: '',
    departmentId: '',
    level: 'Mid',
    skills: '',
    goals: '',
  })

  const load = useCallback(() => {
    api<EnterpriseResponse>('/api/enterprise')
      .then(setData)
      .catch(() => {
        toast({
          title: 'Failed to load enterprise data',
          variant: 'destructive',
        })
      })
    api<AnalyticsResponse>('/api/enterprise/analytics')
      .then(setAnalytics)
      .catch(() => {})
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({
        title: 'Name and email are required',
        variant: 'destructive',
      })
      return
    }
    setAdding(true)
    try {
      await api('/api/enterprise/employees', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role.trim() || undefined,
          departmentId: form.departmentId || undefined,
          level: form.level,
          skills: form.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          goals: form.goals
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          growthScore: 50,
        },
      })
      toast({
        title: 'Employee added',
        description: `${form.name} is now part of the org.`,
      })
      setForm({
        name: '',
        email: '',
        role: '',
        departmentId: '',
        level: 'Mid',
        skills: '',
        goals: '',
      })
      setAddOpen(false)
      load()
    } catch (e) {
      toast({
        title: 'Could not add employee',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setAdding(false)
    }
  }

  if (!data) return <LoadingScreen label="Loading enterprise workspace…" />

  const { tenant, departments, employees, stats } = data

  return (
    <div>
      <ModuleHeader
        title={t('enterpriseTitle')}
        subtitle={t('enterpriseSub')}
        icon={Building2}
        actions={
          <Button onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        }
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="analytics">Skill Analytics</TabsTrigger>
          <TabsTrigger value="mobility">Internal Mobility</TabsTrigger>
        </TabsList>

        {/* ---- Overview ---- */}
        <TabsContent value="overview" className="mt-0">
          <OverviewTab
            tenant={tenant}
            departments={departments}
            stats={stats}
          />
        </TabsContent>

        {/* ---- Employees ---- */}
        <TabsContent value="employees" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" /> Team Directory
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="max-h-[28rem] overflow-y-auto pe-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="w-32">Growth</TableHead>
                      <TableHead>Skills</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-xs text-muted-foreground py-8"
                        >
                          {t('empty')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((emp) => (
                        <TableRow
                          key={emp.id}
                          className="cursor-pointer hover:bg-brand/5 transition-colors"
                          onClick={() => setActiveEmployee(emp)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {emp.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {emp.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {emp.role || '—'}
                          </TableCell>
                          <TableCell>
                            {emp.departmentName ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5"
                              >
                                {emp.departmentName}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {emp.level ? (
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-5 ${
                                  LEVEL_BADGE_CLASS[emp.level] || ''
                                }`}
                              >
                                {emp.level}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={emp.growthScore}
                                className="h-1.5 flex-1"
                              />
                              <span className="text-[11px] font-medium tabular-nums w-7 text-right">
                                {emp.growthScore}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[14rem]">
                              {emp.skills.slice(0, 3).map((s) => (
                                <span
                                  key={s}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                >
                                  {s}
                                </span>
                              ))}
                              {emp.skills.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{emp.skills.length - 3}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                Click any row to view skills, goals, and a suggested growth plan.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Skill Analytics ---- */}
        <TabsContent value="analytics" className="mt-0">
          <SkillAnalyticsTab analytics={analytics} />
        </TabsContent>

        {/* ---- Internal Mobility ---- */}
        <TabsContent value="mobility" className="mt-0">
          <MobilityTab analytics={analytics} onSelectEmployee={(id) => {
            const emp = employees.find((e) => e.id === id)
            if (emp) setActiveEmployee(emp)
          }} />
        </TabsContent>
      </Tabs>

      {/* ---- Add Employee Dialog ---- */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>
              Add a new person to {tenant.name}. They&apos;ll appear in your directory and analytics.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-name">Name</Label>
              <Input
                id="emp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-email">Email</Label>
              <Input
                id="emp-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@acme.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-role">Role</Label>
              <Input
                id="emp-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Software Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={form.departmentId}
                onValueChange={(v) => setForm({ ...form, departmentId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Level</Label>
              <Select
                value={form.level}
                onValueChange={(v) => setForm({ ...form, level: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emp-skills">Skills (comma separated)</Label>
              <Input
                id="emp-skills"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="TypeScript, React, System Design"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emp-goals">Goals (comma separated)</Label>
              <Input
                id="emp-goals"
                value={form.goals}
                onChange={(e) => setForm({ ...form, goals: e.target.value })}
                placeholder="Lead a team, Ship a 0→1 product"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('cancel')}</Button>
            </DialogClose>
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? 'Adding…' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Employee Detail Dialog ---- */}
      <EmployeeDetailDialog
        employee={activeEmployee}
        onClose={() => setActiveEmployee(null)}
      />
    </div>
  )
}

// --- Overview sub-component -------------------------------------------------

function OverviewTab({
  tenant,
  departments,
  stats,
}: {
  tenant: TenantDTO
  departments: DepartmentDTO[]
  stats: EnterpriseStats
}) {
  const kpis = [
    {
      label: 'Total Employees',
      value: stats.totalEmployees.toString(),
      icon: Users,
      delta: `${tenant.seats} seats`,
      color: 'var(--brand)',
    },
    {
      label: 'Departments',
      value: stats.totalDepartments.toString(),
      icon: Layers,
      delta: 'org units',
      color: 'oklch(0.7 0.13 200)',
    },
    {
      label: 'Avg. Growth Score',
      value: stats.avgGrowth.toString(),
      icon: TrendingUp,
      delta: stats.avgGrowth >= 75 ? 'high potential' : 'developing',
      color: 'oklch(0.75 0.15 80)',
    },
    {
      label: 'Top Skill',
      value: stats.topSkill ?? '—',
      icon: Award,
      delta: 'org-wide',
      color: 'oklch(0.65 0.2 30)',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Tenant info + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="h-full overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-brand/15 via-brand/5 to-transparent p-5 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand ring-1 ring-brand/20 flex items-center justify-center">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg leading-tight">
                          {tenant.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {tenant.domain ?? 'No domain set'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge className="border-brand/30 text-brand bg-brand-soft/40 capitalize">
                    {tenant.type}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x">
                <div className="p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Plan
                  </div>
                  <div className="text-sm font-semibold capitalize mt-0.5">
                    {tenant.plan}
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Seats
                  </div>
                  <div className="text-sm font-semibold mt-0.5">
                    {tenant.seats}
                  </div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Joined
                  </div>
                  <div className="text-sm font-semibold mt-0.5">
                    {new Date(tenant.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k, i) => {
            const Icon = k.icon
            return (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
              >
                <Card className="h-full">
                  <CardContent className="p-4">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center mb-3"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${k.color} 14%, transparent)`,
                        color: k.color,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {k.label}
                    </p>
                    <p className="text-xl font-semibold tracking-tight mt-0.5 truncate">
                      {k.value}
                    </p>
                    <p className="text-[10px] text-brand font-medium mt-0.5">
                      {k.delta}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Department breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-brand" /> Department Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {departments.map((d, i) => {
              const color =
                DEPT_COLORS[d.name] || PIE_COLORS[i % PIE_COLORS.length]
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border p-4 hover:border-brand/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="text-sm font-medium">{d.name}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5"
                      style={{
                        borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
                        color,
                      }}
                    >
                      {d.headcount} ppl
                    </Badge>
                  </div>
                  <Progress
                    value={
                      stats.totalEmployees
                        ? (d.headcount / stats.totalEmployees) * 100
                        : 0
                    }
                    className="h-1.5"
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {stats.totalEmployees
                      ? Math.round(
                          (d.headcount / stats.totalEmployees) * 100
                        )
                      : 0}
                    % of org
                  </p>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Skill Analytics sub-component -----------------------------------------

function SkillAnalyticsTab({
  analytics,
}: {
  analytics: AnalyticsResponse | null
}) {
  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-xs text-muted-foreground">
          Loading analytics…
        </CardContent>
      </Card>
    )
  }

  const { topSkills, levelDistribution, departmentHeadcount } = analytics

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top skills bar chart */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Award className="h-4 w-4 text-brand" /> Top Skills Across the Org
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-64">
            {topSkills.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No skills recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSkills}
                  layout="vertical"
                  margin={{ left: 20, right: 16, top: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => [`${v} employees`, 'Have skill']}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--brand)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Level distribution pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Crown className="h-4 w-4 text-brand" /> Level Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-56">
            {levelDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={levelDistribution}
                    dataKey="count"
                    nameKey="level"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {levelDistribution.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, n: string) => [`${v} employees`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {levelDistribution.map((l, i) => (
              <div
                key={l.level}
                className="flex items-center gap-1.5 text-[11px]"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: PIE_COLORS[i % PIE_COLORS.length],
                  }}
                />
                <span>{l.level}</span>
                <span className="text-muted-foreground">{l.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department headcount bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand" /> Department Headcount
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-56">
            {departmentHeadcount.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentHeadcount}
                  margin={{ left: -16, right: 8, top: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => [`${v} employees`, 'Headcount']}
                  />
                  <Bar dataKey="headcount" radius={[4, 4, 0, 0]}>
                    {departmentHeadcount.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          DEPT_COLORS[d.name] ||
                          PIE_COLORS[i % PIE_COLORS.length]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Internal Mobility sub-component ---------------------------------------

function MobilityTab({
  analytics,
  onSelectEmployee,
}: {
  analytics: AnalyticsResponse | null
  onSelectEmployee: (id: string) => void
}) {
  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-xs text-muted-foreground">
          Loading mobility candidates…
        </CardContent>
      </Card>
    )
  }

  const candidates = analytics.mobilityCandidates

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-brand" /> Internal Mobility Candidates
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-xs text-muted-foreground mb-4">
          High-potential employees flagged for internal moves — based on growth
          score and skill match against open senior roles.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {candidates.length === 0 ? (
            <div className="lg:col-span-2 py-10 text-center text-xs text-muted-foreground">
              No mobility candidates yet. Add employees with growth scores above
              70 and matching skills.
            </div>
          ) : (
            candidates.map((c, i) => (
              <motion.div
                key={c.employeeId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border p-4 hover:border-brand/40 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => onSelectEmployee(c.employeeId)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{c.name}</span>
                      {c.departmentName && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5"
                        >
                          {c.departmentName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Currently: {c.role || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Readiness
                    </div>
                    <div
                      className={`text-lg font-bold tabular-nums ${
                        c.readinessScore >= 75
                          ? 'text-brand'
                          : c.readinessScore >= 60
                          ? 'text-amber-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {c.readinessScore}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3 rounded-lg bg-brand-soft/40 px-3 py-2">
                  <ArrowUpRight className="h-4 w-4 text-brand shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Suggested next role
                    </div>
                    <div className="text-sm font-medium text-brand truncate">
                      {c.suggestedNextRole}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Progress
                    value={c.readinessScore}
                    className="h-1.5 flex-1"
                  />
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    Growth {c.growthScore}
                  </span>
                </div>

                {c.matchedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.matchedSkills.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Employee Detail Dialog -------------------------------------------------

function EmployeeDetailDialog({
  employee,
  onClose,
}: {
  employee: EmployeeDTO | null
  onClose: () => void
}) {
  // Simple deterministic growth-plan generator (client-side, no AI call needed)
  const growthPlan = employee
    ? generateGrowthPlan(employee)
    : null

  return (
    <Dialog open={!!employee} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {employee && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{employee.name}</span>
                {employee.level && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 ${
                      LEVEL_BADGE_CLASS[employee.level] || ''
                    }`}
                  >
                    {employee.level}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {employee.role || 'Role unspecified'} · {employee.email}
                {employee.departmentName ? ` · ${employee.departmentName}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Growth score ring */}
              <div className="flex items-center gap-4 rounded-lg border p-3">
                <div className="relative h-14 w-14 shrink-0">
                  <svg
                    viewBox="0 0 36 36"
                    className="h-full w-full -rotate-90"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="var(--muted)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="var(--brand)"
                      strokeWidth="3"
                      strokeDasharray={`${(employee.growthScore / 100) * 97.4} 97.4`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {employee.growthScore}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Growth Score
                  </div>
                  <div className="text-sm font-medium">
                    {employee.growthScore >= 80
                      ? 'High potential — ready for stretch'
                      : employee.growthScore >= 60
                      ? 'Solid trajectory — keep coaching'
                      : 'Early stage — needs structured plan'}
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-brand" /> Skills
                </div>
                {employee.skills.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No skills recorded.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {employee.skills.map((s) => (
                      <span
                        key={s}
                        className="text-xs px-2 py-1 rounded-md bg-muted text-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Goals */}
              <div>
                <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-brand" /> Goals
                </div>
                {employee.goals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No goals set yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {employee.goals.map((g, i) => (
                      <li
                        key={i}
                        className="text-xs flex items-start gap-2 rounded-md bg-muted/50 px-2.5 py-1.5"
                      >
                        <span className="text-brand mt-0.5">·</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Suggested growth plan */}
              {growthPlan && (
                <div className="rounded-lg border border-brand/20 bg-brand-soft/30 p-3">
                  <div className="text-xs font-medium mb-2 flex items-center gap-1.5 text-brand">
                    <Sparkles className="h-3.5 w-3.5" /> Suggested Growth Plan
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="font-medium">Next move:</span>{' '}
                      <span className="text-muted-foreground">
                        {growthPlan.nextMove}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Focus skills:</span>{' '}
                      <span className="text-muted-foreground">
                        {growthPlan.focusSkills.join(', ')}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Timeline:</span>{' '}
                      <span className="text-muted-foreground">
                        {growthPlan.timeline}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Stretch goal:</span>{' '}
                      <span className="text-muted-foreground">
                        {growthPlan.stretch}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// --- Helpers ----------------------------------------------------------------

function generateGrowthPlan(emp: EmployeeDTO): {
  nextMove: string
  focusSkills: string[]
  timeline: string
  stretch: string
} {
  const level = emp.level ?? 'Mid'
  const skills = emp.skills

  // Pick focus skills: known-adjacent senior skills not yet held
  const SENIOR_SKILLS_BY_DEPT: Record<string, string[]> = {
    Engineering: ['System Design', 'Architecture', 'Mentoring', 'Leadership'],
    Product: ['Strategy', 'Leadership', 'Analytics', 'Roadmapping'],
    Design: ['Leadership', 'Design Systems', 'Research', 'Strategy'],
  }
  const deptSkills =
    SENIOR_SKILLS_BY_DEPT[emp.departmentName ?? 'Engineering'] ??
    SENIOR_SKILLS_BY_DEPT.Engineering
  const focusSkills = deptSkills.filter(
    (s) => !skills.some((es) => es.toLowerCase() === s.toLowerCase())
  )
  const focus = focusSkills.length > 0 ? focusSkills.slice(0, 3) : deptSkills.slice(0, 2)

  // Next move + timeline based on current level
  let nextMove = 'Senior IC track'
  let timeline = '6-9 months'
  if (level === 'Junior') {
    nextMove = 'Mid-level promotion'
    timeline = '6-9 months'
  } else if (level === 'Mid') {
    nextMove = 'Senior promotion'
    timeline = '9-12 months'
  } else if (level === 'Senior') {
    nextMove = 'Staff or Lead track'
    timeline = '12-18 months'
  } else if (level === 'Staff' || level === 'Lead') {
    nextMove = 'Principal / Director track'
    timeline = '18-24 months'
  }

  const stretch =
    emp.goals[0] ?? `Own a flagship initiative in the ${emp.departmentName ?? 'org'} within a year`

  return { nextMove, focusSkills: focus, timeline, stretch }
}
