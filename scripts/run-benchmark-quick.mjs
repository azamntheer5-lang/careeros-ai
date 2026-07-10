/**
 * Quick benchmark: run 3 representative fixtures through the live AI pipeline.
 * Runs sequentially with per-fixture timeouts.
 */
const API_URL = 'http://localhost:3000'

const { BENCHMARK_FIXTURES } = await import('../tests/fixtures/benchmarks.ts')
const { evaluateResume } = await import('../src/lib/resume-evaluator.ts')

// Pick 3 representative fixtures
const FIXTURE_IDS = ['cyber-grad-bilingual', 'fresh-grad-short', 'senior-swe-linkedin']
const fixtures = BENCHMARK_FIXTURES.filter(f => FIXTURE_IDS.includes(f.id))

console.log(`\n🧪 Running ${fixtures.length} benchmark fixtures...\n`)

const results = []

for (const fixture of fixtures) {
  console.log(`▶ ${fixture.label} (${fixture.rawText.length} chars)...`)
  const t0 = Date.now()
  try {
    const res = await fetch(`${API_URL}/api/desktop/generate-resume-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: fixture.rawText, enrich: true, optimizeATS: false }),
      signal: AbortSignal.timeout(90000),
    })
    const latency = Date.now() - t0
    const data = await res.json()

    if (!res.ok || data.error) {
      console.log(`  ❌ FAIL (${latency}ms): ${data.error || res.status}`)
      results.push({ fixture, latency, error: data.error || `HTTP ${res.status}`, evaluation: null })
      continue
    }

    const evaluation = evaluateResume(data.resume, fixture.rawText, data.missingInfo || [], fixture.expectedFields)

    console.log(`  ✅ OK (${latency}ms) — Score: ${evaluation.overall}/100 — Hallucinations: ${evaluation.hallucinations.length}`)
    console.log(`     Name: ${data.resume?.contact?.name || '—'}`)
    console.log(`     Email: ${data.resume?.contact?.email || '—'}`)
    console.log(`     Experience: ${data.resume?.experience?.length || 0} entries`)
    console.log(`     Skills: ${data.resume?.skills?.technical?.length || 0} technical, ${data.resume?.skills?.soft?.length || 0} soft`)
    
    for (const m of evaluation.metrics) {
      console.log(`     ${m.passed ? '✅' : '❌'} ${m.name}: ${m.score} — ${m.details}`)
    }
    if (evaluation.hallucinations.length > 0) {
      console.log(`  ⚠️  Hallucinations:`)
      evaluation.hallucinations.forEach(h => console.log(`     • ${h}`))
    }

    results.push({ fixture, latency, evaluation, error: null })
  } catch (e) {
    const latency = Date.now() - t0
    console.log(`  ❌ EXCEPTION (${latency}ms): ${e.message}`)
    results.push({ fixture, latency, error: e.message, evaluation: null })
  }
}

// Summary
console.log('\n═══════════════════════════════════════')
console.log('           BENCHMARK SUMMARY')
console.log('═══════════════════════════════════════')
const ok = results.filter(r => r.evaluation)
const fail = results.filter(r => !r.evaluation)
console.log(`Total: ${results.length} | Success: ${ok.length} | Failed: ${fail.length}`)
if (ok.length > 0) {
  const avgScore = Math.round(ok.reduce((s, r) => s + r.evaluation.overall, 0) / ok.length)
  const avgLat = Math.round(ok.reduce((s, r) => s + r.latency, 0) / ok.length)
  const totalHalluc = ok.reduce((s, r) => s + r.evaluation.hallucinations.length, 0)
  console.log(`Average Score: ${avgScore}/100`)
  console.log(`Average Latency: ${avgLat}ms`)
  console.log(`Total Hallucinations: ${totalHalluc}`)

  // Per-metric
  const metricNames = ok[0].evaluation.metrics.map(m => m.name)
  for (const name of metricNames) {
    const scores = ok.map(r => r.evaluation.metrics.find(m => m.name === name)?.score || 0)
    const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
    const icon = avg >= 70 ? '✅' : avg >= 50 ? '⚠️ ' : '❌'
    console.log(`  ${icon} ${name}: ${avg}/100`)
  }
}

// Save report
const fs = await import('fs')
const report = {
  timestamp: new Date().toISOString(),
  totalFixtures: results.length,
  successful: ok.length,
  failed: fail.length,
  avgOverallScore: ok.length ? Math.round(ok.reduce((s, r) => s + r.evaluation.overall, 0) / ok.length) : 0,
  avgLatencyMs: ok.length ? Math.round(ok.reduce((s, r) => s + r.latency, 0) / ok.length) : 0,
  totalHallucinations: ok.reduce((s, r) => s + r.evaluation.hallucinations.length, 0),
  results: results.map(r => ({
    fixtureId: r.fixture.id,
    label: r.fixture.label,
    category: r.fixture.category,
    inputWords: r.fixture.rawText.split(/\s+/).length,
    latencyMs: r.latency,
    overallScore: r.evaluation?.overall ?? null,
    hallucinations: r.evaluation?.hallucinations ?? [],
    error: r.error,
    metrics: r.evaluation?.metrics.map(m => ({ name: m.name, score: m.score, passed: m.passed, details: m.details })) ?? [],
  })),
}
fs.writeFileSync('docs/BENCHMARK_REPORT.json', JSON.stringify(report, null, 2))
console.log('\n📄 Report saved to docs/BENCHMARK_REPORT.json')
