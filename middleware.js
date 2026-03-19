// middleware.js
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
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

  // Usar getSession — lee cookie directamente sin llamada externa
  // Esto evita la condición de carrera entre el cliente y el servidor
  let session = null
  try {
    const { data } = await supabase.auth.getSession()
    session = data?.session ?? null
  } catch {
    session = null
  }

  const { pathname } = request.nextUrl

  const isProtected =
    pathname === '/log' ||
    pathname.startsWith('/log/') ||
    pathname.startsWith('/dashboard')

  // Sin sesión → redirigir a login
  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Con sesión en login → redirigir a /log
  if (pathname === '/login' && session) {
    const url = request.nextUrl.clone()
    url.pathname = '/log'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/log', '/log/:path*', '/dashboard/:path*', '/login'],
}
