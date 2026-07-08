/**
 * CareerOS AI — Setup Script
 *
 * Run: bun run setup  OR  npm run setup
 *
 * This script:
 * 1. Ensures the db/ directory exists
 * 2. Generates the Prisma client
 * 3. Creates the SQLite database + pushes schema
 * 4. Seeds demo data if the database is empty
 * 5. Verifies the setup works
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const DB_DIR = join(ROOT, 'db')
const DB_FILE = join(DB_DIR, 'custom.db')

function run(cmd, label) {
  console.log(`\n▶ ${label}...`)
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: process.env })
    console.log(`✅ ${label} — نجح`)
  } catch (e) {
    console.error(`❌ ${label} — فشل`)
    console.error(e.message)
    process.exit(1)
  }
}

function log(msg) {
  console.log(`  ${msg}`)
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║     CareerOS AI — Setup Script               ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // Step 1: Ensure db directory exists
  console.log('━━━ الخطوة 1: إنشاء مجلد قاعدة البيانات ━━━')
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true })
    log('تم إنشاء مجلد db/')
  } else {
    log('مجلد db/ موجود بالفعل')
  }

  // Step 2: Generate Prisma client
  console.log('\n━━━ الخطوة 2: توليد عميل Prisma ━━━')
  run('npx prisma generate', 'توليد Prisma Client')

  // Step 3: Push schema to database (creates DB if missing)
  console.log('\n━━━ الخطوة 3: إنشاء قاعدة البيانات ودفع المخطط ━━━')
  run('npx prisma db push', 'دفع المخطط إلى قاعدة البيانات')

  // Check if DB was created
  if (existsSync(DB_FILE)) {
    const size = statSync(DB_FILE).size
    log(`قاعدة البيانات: ${DB_FILE} (${(size / 1024).toFixed(0)} KB)`)
  } else {
    log('⚠️  تحذير: لم يتم العثور على ملف قاعدة البيانات')
  }

  // Step 4: Verify by calling the bootstrap API
  console.log('\n━━━ الخطوة 4: فحص الإعداد ━━━')

  // We can't call the API yet (server not running), so we verify by importing Prisma directly
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    // Count users — if 0, the bootstrap API will seed on first run
    const userCount = await prisma.user.count()
    log(`عدد المستخدمين: ${userCount}`)

    if (userCount === 0) {
      log('قاعدة البيانات فارغة — سيتم إنشاء بيانات تجريبية تلقائياً عند أول تشغيل')
    } else {
      log('قاعدة البيانات تحتوي على بيانات — جاهزة للاستخدام')
    }

    // Check tables exist
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    log(`عدد الجداول: ${tables.length}`)

    await prisma.$disconnect()
    console.log('\n✅ الإعداد مكتمل بنجاح!')
  } catch (e) {
    console.error('\n❌ فشل التحقق من قاعدة البيانات:', e.message)
    process.exit(1)
  }

  console.log('\n━━━ الخطوات التالية ━━━')
  console.log('  شغّل التطبيق الآن:')
  console.log('    bun run dev   (أو npm run dev)')
  console.log('  ثم افتح المتصفح:')
  console.log('    http://localhost:3000')
  console.log('')
}

main().catch((e) => {
  console.error('\n❌ خطأ غير متوقع:', e)
  process.exit(1)
})
