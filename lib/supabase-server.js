// lib/supabase-server.js
// Cliente de Supabase para uso en Server Components y API Routes
// Lee y escribe cookies de sesión correctamente en el edge

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // En Server Components (read-only) esto puede fallar — es seguro ignorarlo
          }
        },
      },
    }
  )
}

// Obtiene el usuario autenticado desde una API Route.
// Lanza un error 401 si no hay sesión válida.
export async function requireAuth() {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { user, supabase }
}
