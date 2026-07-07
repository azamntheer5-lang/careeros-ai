import { NextResponse } from 'next/server'
import { getCurrentUser, err } from '@/lib/server'
import { getCreditStatus } from '@/lib/credits'
import { CREDIT_PACKAGES } from '@/lib/billing'

/** GET credit balance + transactions + packages. */
export async function GET() {
  try {
    const user = await getCurrentUser()
    const status = await getCreditStatus(user.id)
    return NextResponse.json({ ...status, packages: CREDIT_PACKAGES })
  } catch (e) { return err(e) }
}
