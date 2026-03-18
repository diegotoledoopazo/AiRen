// middleware.js
// Protege todas las rutas bajo /(app) — redirige a /login si no hay sesión.
// Las rutas públicas (login, registro) no pasan por este check.

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rutas protegidas: todo bajo /log y /dashboard
  const isProtected = pathname.startsWith('/log') || pathname.startsWith('/dashboard')

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Si ya está logueado y va a /login, redirigir al logger
  if (pathname === '/login' && user) {
    const logUrl = request.nextUrl.clone()
    logUrl.pathname = '/log'
    return NextResponse.redirect(logUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/log/:path*', '/dashboard/:path*', '/login'],
}
