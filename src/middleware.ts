import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security middleware — sets HTTP security headers on every response.
 *
 * Headers:
 * - Content-Security-Policy: prevents XSS by restricting resource sources
 * - X-Frame-Options: prevents clickjacking
 * - X-Content-Type-Options: prevents MIME sniffing
 * - Referrer-Policy: controls referrer information
 * - Strict-Transport-Security: enforces HTTPS
 * - X-DNS-Prefetch-Control: disables DNS prefetching for privacy
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Content Security Policy
  // Allows: self, inline styles (Tailwind needs this), Google Fonts, data: URIs
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()')

  // HSTS only in production (behind HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  return response
}

export const config = {
  matcher: [
    // Apply to all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt|manifest.json).*)',
  ],
}
