import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Log all API requests
  if (pathname.startsWith('/api/')) {
    console.log(`[API] ${request.method} ${pathname}`)
  }

  // Set response headers
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
