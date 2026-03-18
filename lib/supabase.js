// lib/supabase.js
// Cliente de Supabase para uso en el browser (componentes client-side)
// Usa @supabase/ssr para manejar cookies correctamente con Next.js App Router

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
