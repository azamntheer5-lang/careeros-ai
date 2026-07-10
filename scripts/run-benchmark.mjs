/**
 * Live AI Benchmark Runner
 *
 * Runs the actual AI resume pipeline against all benchmark fixtures,
 * evaluates each result with the 14-metric evaluator, and generates
 * a comparison report.
 *
 * Usage: bun run scripts/run-benchmark.mjs
 * Requires: dev server running on http://localhost:3000
 */

const API_URL = process.env.BENCHMARK_API_URL || 'http://localhost:3000'

// Import fixtures and evaluator dynamically
const { BENCHMARK_FIXTURES } = await import('../tests/fixtures/benchmarks.ts')
const { evaluateResume } = await import('../src/lib/resume-evaluator.ts')

console.log('\n╔══════════════════════════════════════════════════════╗')
console.log('║     CareerOS AI — Live Resume Pipeline Benchmark     ║')
console.log('╚══════════════════════════════════════════════════════╝\n')

const results = []

for (let i = 0; i < BENCHMARK_FIXTURES.length; i++) {
  const fixture = BENCHMARK_FIXTURES[i]
  console.log(`\n━━━ [${i + 1}/${BENCHMARK_FIXTURES.length}] ${fixture.label} ━━━`)
  console.log(`  Category: ${fixture.category}`)
  console.log(`  Input: ${fixture.rawText.length} chars, ${fixture.rawText.split(/\s+/).length} words`)
  console.log(`  Expected language: ${fixture.expectedLanguage}`)

  const startTime = Date.now()

  try {
    // Call the live AI pipeline
    const response = await fetch(`${API_URL}/api/desktop/generate-resume-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: fixture.rawText,
        enrich: true,
        optimizeATS: false,
      }),
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`  ❌ API returned ${response.status}: ${errorText.slice(0, 200)}`)
      results.push({ fixture, error: `API ${response.status}`, latency, evaluation: null })
      continue
    }

    const data = await response.json()

    if (data.error) {
      console.log(`  ❌ Pipeline error: ${data.error}`)
      results.push({ fixture, error: data.error, latency, evaluation: null })
      continue
    }

    // Evaluate the result
    const evaluation = evaluateResume(
      data.resume,
      fixture.rawText,
      data.missingInfo || [],
      fixture.expectedFields
    )

    console.log(`  ✅ Generated in ${latency}ms`)
    console.log(`  📊 Overall Score: ${evaluation.overall}/100`)
    console.log(`  🔍 Hallucinations: ${evaluation.hallucinations.length}`)

    // Print key metrics
    for (const m of evaluation.metrics) {
      const icon = m.passed ? '✅' : '❌'
      console.log(`    ${icon} ${m.name}: ${m.score}/100 — ${m.details}`)
    }

    // Print extracted fields summary
    if (data.resume?.contact) {
      console.log(`  📋 Extracted:`)
      console.log(`     Name: ${data.resume.contact.name || '—'}`)
      console.log(`     Email: ${data.resume.contact.email || '—'}`)
      console.log(`     Phone: ${data.resume.contact.phone || '—'}`)
      console.log(`     Experience entries: ${data.resume.experience?.length || 0}`)
      console.log(`     Education entries: ${data.resume.education?.length || 0}`)
      console.log(`     Technical skills: ${data.resume.skills?.technical?.length || 0}`)
      console.log(`     Courses: ${data.resume.courses?.length || 0}`)
    }

    if (evaluation.hallucinations.length > 0) {
      console.log(`  ⚠️  Hallucinations:`)
      for (const h of evaluation.hallucinations) {
        console.log(`     • ${h}`)
      }
    }

    if (evaluation.recommendations.length > 0) {
      console.log(`  💡 Recommendations:`)
      for (const r of evaluation.recommendations) {
        console.log(`     • ${r}`)
      }
    }

    results.push({ fixture, latency, evaluation, data, error: null })
  } catch (e) {
    const latency = Date.now() - startTime
    console.log(`  ❌ Exception: ${e.message}`)
    results.push({ fixture, error: e.message, latency, evaluation: null })
  }
}

// ─── Generate Summary Report ───────────────────────────────────────

console.log('\n\n╔══════════════════════════════════════════════════════╗')
console.log('║                  BENCHMARK SUMMARY                    ║')
console.log('╚══════════════════════════════════════════════════════╝\n')

const successful = results.filter(r => r.evaluation)
const failed = results.filter(r => !r.evaluation)

console.log(`Total fixtures: ${results.length}`)
console.log(`Successful: ${successful.length}`)
console.log(`Failed: ${failed.length}`)

if (successful.length > 0) {
  const avgOverall = Math.round(successful.reduce((s, r) => s + r.evaluation.overall, 0) / successful.length)
  const avgLatency = Math.round(successful.reduce((s, r) => s + r.latency, 0) / successful.length)
  const totalHallucinations = successful.reduce((s, r) => s + r.evaluation.hallucinations.length, 0)
  const zeroHallucination = successful.filter(r => r.evaluation.hallucinations.length === 0).length

  console.log(`\nAverage Overall Score: ${avgOverall}/100`)
  console.log(`Average Latency: ${avgLatency}ms`)
  console.log(`Total Hallucinations: ${totalHallucinations}`)
  console.log(`Zero-Hallucination Results: ${zeroHallucination}/${successful.length}`)

  // Per-metric averages
  console.log('\n--- Per-Metric Averages ---')
  const metricNames = successful[0].evaluation.metrics.map(m => m.name)
  for (const name of metricNames) {
    const scores = successful.map(r => r.evaluation.metrics.find(m => m.name === name)?.score || 0)
    const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
    const icon = avg >= 70 ? '✅' : avg >= 50 ? '⚠️ ' : '❌'
    console.log(`  ${icon} ${name}: ${avg}/100`)
  }

  // Per-fixture summary table
  console.log('\n--- Per-Fixture Summary ---')
  console.log('  ID                          | Score | Halluc | Latency  | Status')
  console.log('  ----------------------------|-------|--------|----------|-------')
  for (const r of results) {
    const score = r.evaluation?.overall ?? 'ERR'
    const halluc = r.evaluation?.hallucinations.length ?? '-'
    const lat = r.latency + 'ms'
    const status = r.error ? `❌ ${r.error.slice(0, 20)}` : '✅'
    console.log(`  ${r.fixture.id.padEnd(28)} | ${String(score).padEnd(5)} | ${String(halluc).padEnd(6)} | ${lat.padEnd(8)} | ${status}`)
  }
}

// Write JSON report
const report = {
  timestamp: new Date().toISOString(),
  totalFixtures: results.length,
  successful: successful.length,
  failed: failed.length,
  avgOverallScore: successful.length ? Math.round(successful.reduce((s, r) => s + r.evaluation.overall, 0) / successful.length) : 0,
  avgLatencyMs: successful.length ? Math.round(successful.reduce((s, r) => s + r.latency, 0) / successful.length) : 0,
  totalHallucinations: successful.reduce((s, r) => s + r.evaluation.hallucinations.length, 0),
  results: results.map(r => ({
    fixtureId: r.fixture.id,
    fixtureLabel: r.fixture.label,
    category: r.fixture.category,
    inputWords: r.fixture.rawText.split(/\s+/).length,
    latencyMs: r.latency,
    overallScore: r.evaluation?.overall ?? null,
    hallucinations: r.evaluation?.hallucinations ?? [],
    metrics: r.evaluation?.metrics.map(m => ({ name: m.name, score: m.score, passed: m.passed, details: m.details })) ?? [],
    error: r.error,
  })),
}

const fs = await import('fs')
fs.writeFileSync('docs/BENCHMARK_REPORT.json', JSON.stringify(report, null, 2))
console.log('\n📄 Full report saved to docs/BENCHMARK_REPORT.json')
