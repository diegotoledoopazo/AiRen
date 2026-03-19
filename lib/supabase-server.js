// lib/supabase-server.js
import { createClient } from '@supabase/supabase-js'

// requireAuth — verifica el token JWT del header Authorization
// Compatible con Next.js 15 — no depende de cookies()
export async function requireAuth(request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    throw new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verificar token con Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Cliente autenticado con el token del usuario
  const authedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    }
  )

  return { user, supabase: authedClient }
}

// createServerSupabaseClient — para Server Components (sin auth)
export async function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
