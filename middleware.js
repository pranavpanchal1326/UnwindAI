// middleware.js
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request) {
  let response = NextResponse.next({
    request: { headers: request.headers }
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options })
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes — require authentication
  const protectedRoutes = [
    '/dashboard',
    '/intake',
    '/settlement',
    '/decisions',
    '/vault',
    '/settings',
    '/kids'
  ]

  // Professional routes — require professional auth
  const professionalRoutes = ['/professional']

  const pathname = request.nextUrl.pathname

  // Check professional routes
  if (professionalRoutes.some(r => pathname.startsWith(r))) {
    if (!user) {
      return NextResponse.redirect(
        new URL('/professional/signin', request.url)
      )
    }
    // Additional professional check handled in layout
    return response
  }

  // Check user protected routes
  if (protectedRoutes.some(r => pathname.startsWith(r))) {
    if (!user) {
      return NextResponse.redirect(
        new URL('/', request.url)
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|auth/callback).*)'
  ]
}
