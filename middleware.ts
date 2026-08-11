import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/webhooks', '/api/cron']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Log all API requests
  if (pathname.startsWith('/api/')) {
    console.log(`[API] ${request.method} ${pathname}`)
  }

  if (!isPublicPath(pathname)) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      }
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
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
