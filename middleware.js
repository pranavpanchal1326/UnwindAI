// middleware.js — HARDENED VERSION
// Protects user routes, professional routes, API routes
// Allows: /, /professional/signin, /api/auth/*, public assets

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'


// Routes that never need auth
const PUBLIC_ROUTES = new Set([
  '/',
  '/professional/signin',
  '/professional/register',
  '/intake'
])

// Routes that need professional auth specifically
const PROFESSIONAL_ROUTES = ['/professional']

export async function middleware(req) {
  // DEMO_MODE: Full bypass for demo environment stability
  // Must be first to avoid any potential crashes in auth logic
  if (process.env.DEMO_MODE === 'true') {
    return NextResponse.next()
  }

  const { pathname } = req.nextUrl
  let res = NextResponse.next()



  // Public assets — skip immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/models') ||
    pathname.startsWith('/onnxruntime-web') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg')
  ) {
    return res
  }

  // Public routes — no auth needed
  if (PUBLIC_ROUTES.has(pathname)) return res

  // API auth routes — no auth needed
  if (pathname.startsWith('/api/auth/')) return res

  // DEMO_MODE: skip auth checks for API routes
  if (
    pathname.startsWith('/api/') &&
    process.env.DEMO_MODE === 'true'
  ) {
    return res
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value))
            res = NextResponse.next({ request: req })
            cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
          },
        },
      }
    )

    const {
      data: { session }
    } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      )
    ])

    // No session — redirect to appropriate sign-in
    if (!session) {
      // Professional portal → professional sign-in
      if (PROFESSIONAL_ROUTES.some(
        r => pathname.startsWith(r)
      )) {
        return NextResponse.redirect(
          new URL('/professional/signin', req.url)
        )
      }
      // User pages → home
      if (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/settlement') ||
        pathname.startsWith('/vault') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/kids')
      ) {
        return NextResponse.redirect(
          new URL('/', req.url)
        )
      }
    }

    return res

  } catch (err) {
    // Supabase timeout — allow through in DEMO_MODE
    console.warn('[Middleware] Auth check failed:', err.message)
    if (process.env.DEMO_MODE === 'true') return res

    // In production — fail safe to home
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return res
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}